
import { useMemo, useState, useRef } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from "recharts";
import { StudentRecord, parseTimeToMinutes } from "@/types/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    AlertTriangle,
    Clock,
    BarChart3,
    FileDown,
    Printer,
    Calendar
} from "lucide-react";
import { useAdminStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

interface CareAnalyticsProps {
    data: StudentRecord[];
}

const WEEKDAYS = ["월", "화", "수", "목", "금"];

const CareAnalytics = ({ data }: CareAnalyticsProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { getClassCapacity, caregiverStart, caregiverEnd } = useAdminStore();
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedDay, setSelectedDay] = useState<string>(
        new Date().getDay() >= 1 && new Date().getDay() <= 5
            ? WEEKDAYS[new Date().getDay() - 1]
            : "월"
    );
    const [isExporting, setIsExporting] = useState(false);

    const classes = useMemo(() => {
        const unique = Array.from(new Set(data.map((d) => d.className).filter(Boolean)));
        return unique.sort();
    }, [data]);

    const currentCapacity = useMemo(() => {
        if (selectedClass === "all") return 999;
        return getClassCapacity(selectedClass);
    }, [selectedClass, getClassCapacity]);

    const chartData = useMemo(() => {
        if (data.length === 0) return [];

        const startMin = parseTimeToMinutes(caregiverStart) || 780; // 13:00 default
        const endMin = parseTimeToMinutes(caregiverEnd) || 1080;   // 18:00 default

        const slots = [];
        for (let m = startMin; m < endMin; m += 60) {
            const h = Math.floor(m / 60);
            slots.push(`${String(h).padStart(2, "0")}:00`);
        }

        return slots.map((slot) => {
            const slotStart = parseTimeToMinutes(slot);
            const slotEnd = slotStart + 60;

            let peakInHour = 0;
            for (let checkMin = slotStart; checkMin < slotEnd; checkMin += 10) {
                const countAtTime = data.filter((s) => {
                    const matchClass = selectedClass === "all" || s.className === selectedClass;
                    const matchDay = s.dayOfWeek.includes(selectedDay);
                    if (!matchClass || !matchDay) return false;

                    const sStart = parseTimeToMinutes(s.startTime);
                    const sEnd = parseTimeToMinutes(s.endTime);
                    return checkMin >= sStart && checkMin < sEnd;
                }).length;
                if (countAtTime > peakInHour) peakInHour = countAtTime;
            }

            const isOver = selectedClass !== "all" && peakInHour > currentCapacity;

            return {
                time: slot,
                count: peakInHour,
                isOver,
            };
        });
    }, [data, selectedClass, selectedDay, currentCapacity, caregiverStart, caregiverEnd]);

    const exportToPDF = async () => {
        if (!chartRef.current) return;
        setIsExporting(true);

        toast({
            title: "PDF 생성 중",
            description: "한글 폰트 최적화 및 리포트를 생성하고 있습니다.",
        });

        try {
            // Create a canvas of the entire component including the title and stats
            // Since it's an image capture, Korean text will look perfect.
            const canvas = await html2canvas(chartRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = pdfWidth - 20; // 10mm margins
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // We avoid using pdf.text() for Korean characters because of font issues.
            // Instead, we ensure the captured DOM has everything needed.

            pdf.addImage(imgData, "PNG", 10, 15, imgWidth, imgHeight);

            // Footer doesn't have Korean to avoid breakage, or we could add it to DOM too.
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text(`Care Class Management System - ${new Date().toLocaleDateString()}`, pdfWidth / 2, pdfHeight - 10, { align: "center" });

            pdf.save(`Care_Analysis_Report_${new Date().getTime()}.pdf`);

            toast({
                title: "PDF 내보내기 완료",
                description: "리포트가 성공적으로 저장되었습니다.",
            });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({
                variant: "destructive",
                title: "내보내기 실패",
                description: "리포트 생성 중 오류가 발생했습니다.",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const maxCount = useMemo(() => {
        return Math.max(...chartData.map((d) => d.count), 0);
    }, [chartData]);

    const peakTimeByBar = useMemo(() => {
        const peak = chartData.find((d) => d.count === maxCount && maxCount > 0);
        return peak ? peak.time : "-";
    }, [chartData, maxCount]);

    const hasWarning = useMemo(() => {
        return chartData.some(d => d.isOver);
    }, [chartData]);

    if (data.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* Control Panel (Not included in PDF) */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        분석 대시보드 옵션
                    </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-slate-600">근무: {caregiverStart} ~ {caregiverEnd}</span>
                    </div>
                    <Button
                        variant="default"
                        className="h-10 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 font-bold"
                        onClick={exportToPDF}
                        disabled={isExporting}
                    >
                        <FileDown className="h-4 w-4" />
                        <span>PDF 리포트 출력</span>
                    </Button>
                </div>
            </div>

            <div ref={chartRef} className="bg-white p-2 rounded-3xl">
                {/* PDF Header (Included in Capture) */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">돌봄교실 시간대별 인원 분석 리포트</h1>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                <span>{selectedDay}요일 분석</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                                <Users className="h-3.5 w-3.5 text-blue-500" />
                                <span>교실: {selectedClass === 'all' ? '전체 교실' : selectedClass}</span>
                            </div>
                            {selectedClass !== 'all' && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                    <span>최대 수용: {currentCapacity}명</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Export Date</div>
                        <div className="text-xs font-bold text-slate-600 mt-1">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
                        {/* Main Bar Chart */}
                        <div className="h-[400px] w-full rounded-3xl bg-slate-50/50 p-6 border border-slate-100 shadow-inner overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="time"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "#64748B", fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "#64748B", fontWeight: 700 }}
                                        domain={[0, selectedClass !== "all" ? Math.max(currentCapacity + 5, maxCount + 2) : 'auto']}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#F1F5F9' }}
                                        contentStyle={{
                                            backgroundColor: "#FFFFFF",
                                            borderRadius: "20px",
                                            border: "none",
                                            boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.15)",
                                            padding: "16px"
                                        }}
                                        itemStyle={{ fontWeight: "900", fontSize: "16px" }}
                                        labelStyle={{ marginBottom: "8px", fontWeight: "800", color: "#1E293B", fontSize: "14px" }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        name="학생 수"
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                        animationDuration={1000}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.isOver ? "#F43F5E" : "#3B82F6"}
                                                className="transition-all duration-300 hover:opacity-80"
                                            />
                                        ))}
                                    </Bar>

                                    {selectedClass !== "all" && (
                                        <ReferenceLine
                                            y={currentCapacity}
                                            stroke="#F43F5E"
                                            strokeDasharray="8 4"
                                            strokeWidth={2}
                                            label={{
                                                value: `최대 수용 한도 (${currentCapacity}명)`,
                                                position: 'top',
                                                fill: '#F43F5E',
                                                fontSize: 11,
                                                fontWeight: '900',
                                                offset: 10
                                            }}
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Side Info */}
                        <div className="flex flex-col gap-6">
                            <div className={`relative overflow-hidden rounded-3xl p-6 transition-all ${hasWarning ? 'bg-rose-50 border border-rose-100' : 'bg-blue-50 border border-blue-100'}`}>
                                <div className="relative z-10">
                                    <div className={`flex items-center gap-2 mb-3 ${hasWarning ? 'text-rose-600' : 'text-blue-600'}`}>
                                        <Users className="h-5 w-5" />
                                        <span className="text-xs font-black uppercase tracking-widest">일일 최대 인원</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <div className={`text-5xl font-black leading-none ${hasWarning ? 'text-rose-600' : 'text-blue-600'}`}>
                                            {maxCount}
                                        </div>
                                        <span className={`text-lg font-bold ${hasWarning ? 'text-rose-400' : 'text-blue-400'}`}>명</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                                <div className="flex items-center gap-2 text-slate-400 mb-5">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">피크 타임 분석</span>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="text-[11px] font-bold text-slate-400 mb-1">인원 집중 시간</div>
                                        <div className="text-2xl font-black text-slate-800 tabular-nums">
                                            {peakTimeByBar !== "-" ? `${peakTimeByBar} ~ ${parseInt(peakTimeByBar.split(':')[0]) + 1}:00` : "-"}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-200">
                                        <div className="text-[11px] font-bold text-slate-400 mb-3">수용 인원 현황</div>
                                        {selectedClass !== "all" ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-600">설정된 한도</span>
                                                    <span className="text-sm font-black text-slate-900">{currentCapacity}명</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${hasWarning ? 'bg-rose-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min((maxCount / currentCapacity) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 italic">교실을 선택하면 상세 분석 데이터가 표시됩니다.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legend / Report Info */}
                    <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-end">
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-500">안정 (한도 내)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-rose-500" />
                                    <span className="text-[10px] font-bold text-slate-500">주의 (한도 초과)</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[500px]">
                                * 본 리포트의 데이터는 설정된 전담사 근무시간({caregiverStart}~{caregiverEnd}) 내 1시간 단위 피크 인원을 기준으로 집계되었습니다.
                            </p>
                        </div>
                        <div className="text-sm font-black text-blue-600/20 italic select-none">
                            CARE CLASS MANAGER
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Overlays (Not in PDF) */}
            <Card className="border-none shadow-lg bg-white p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">데이터 필터:</span>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-[160px] h-10 rounded-xl border-slate-100 bg-slate-50 font-bold">
                            <SelectValue placeholder="교실 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 교실</SelectItem>
                            {classes.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                        <SelectTrigger className="w-[120px] h-10 rounded-xl border-slate-100 bg-slate-50 font-bold">
                            <SelectValue placeholder="요일" />
                        </SelectTrigger>
                        <SelectContent>
                            {WEEKDAYS.map((day) => (
                                <SelectItem key={day} value={day}>{day}요일</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </Card>
        </div>
    );
};

export default CareAnalytics;
