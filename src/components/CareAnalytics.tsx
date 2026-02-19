
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
    Calendar,
    ClipboardCheck
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
    const hiddenReportRef = useRef<HTMLDivElement>(null);
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

    // Helper to get chart data for a specific class
    const getChartDataForClass = (targetClass: string) => {
        const startMin = parseTimeToMinutes(caregiverStart) || 780;
        const endMin = parseTimeToMinutes(caregiverEnd) || 1080;

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
                    const matchClass = targetClass === "all" || s.className === targetClass;
                    const matchDay = s.dayOfWeek.includes(selectedDay);
                    if (!matchClass || !matchDay) return false;

                    const sStart = parseTimeToMinutes(s.startTime);
                    const sEnd = parseTimeToMinutes(s.endTime);
                    return checkMin >= sStart && checkMin < sEnd;
                }).length;
                if (countAtTime > peakInHour) peakInHour = countAtTime;
            }

            const capacity = targetClass === "all" ? 999 : getClassCapacity(targetClass);
            const isOver = targetClass !== "all" && peakInHour > capacity;

            return {
                time: slot,
                count: peakInHour,
                isOver,
                capacity
            };
        });
    };

    const currentChartData = useMemo(() => getChartDataForClass(selectedClass),
        [data, selectedClass, selectedDay, caregiverStart, caregiverEnd, getClassCapacity]);

    const exportComprehensivePDF = async () => {
        if (!hiddenReportRef.current) return;
        setIsExporting(true);

        toast({
            title: "종합 리포트 생성 중",
            description: "전체 교실별 데이터를 포함한 다중 페이지 리포트를 생성하고 있습니다.",
        });

        try {
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pdfWidth - (margin * 2);

            // We will capture sections from the hidden container
            const sections = Array.from(hiddenReportRef.current.children) as HTMLElement[];

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];

                const canvas = await html2canvas(section, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                });

                const imgData = canvas.toDataURL("image/png");
                const imgHeight = (canvas.height * contentWidth) / canvas.width;

                if (i > 0) pdf.addPage();

                // Add minimal header info on each page
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(`Care Class Management System | ${selectedDay}요일 분석 리포트 | Page ${i + 1}`, pdfWidth / 2, 10, { align: "center" });

                pdf.addImage(imgData, "PNG", margin, 15, contentWidth, imgHeight);

                // Add footer
                pdf.text(`출력일시: ${new Date().toLocaleString()}`, margin, pdfHeight - 8);
            }

            pdf.save(`돌봄교실_종합분석리포트_${selectedDay}요일.pdf`);

            toast({
                title: "종합 PDF 내보내기 완료",
                description: "전체 교실별 상세 리포트 다운로드가 완료되었습니다.",
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
        return Math.max(...currentChartData.map((d) => d.count), 0);
    }, [currentChartData]);

    const peakTimeByBar = useMemo(() => {
        const peak = currentChartData.find((d) => d.count === maxCount && maxCount > 0);
        return peak ? peak.time : "-";
    }, [currentChartData, maxCount]);

    const hasWarning = useMemo(() => {
        return currentChartData.some(d => d.isOver);
    }, [currentChartData]);

    if (data.length === 0) return null;

    // Components for individual report pages (used in hidden container)
    const ReportPage = ({ title, className, chartData, capacity }: { title: string, className: string, chartData: any[], capacity: number }) => {
        const pageMax = Math.max(...chartData.map((d: any) => d.count), 0);
        const pageHasWarning = chartData.some((d: any) => d.isOver);
        const peak = chartData.find((d: any) => d.count === pageMax && pageMax > 0);
        const peakStr = peak ? `${peak.time} ~ ${parseInt(peak.time.split(':')[0]) + 1}:00` : "-";

        return (
            <div style={{ width: '800px', padding: '40px', backgroundColor: 'white', marginBottom: '20px' }} className="report-section">
                <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{title}</h2>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '6px' }}>
                            돌봄구분: {className === 'all' ? '전체 합계' : className}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '6px' }}>
                            수용량: {className === 'all' ? '해당없음' : `${capacity}명`}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '30px' }}>
                    <div style={{ height: '350px', backgroundColor: '#f8fafc', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B", fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B", fontWeight: 700 }} domain={[0, className !== 'all' ? Math.max(capacity + 5, pageMax + 2) : 'auto']} />
                                <Bar dataKey="count" radius={[5, 5, 0, 0]} barSize={30}>
                                    {chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.isOver ? "#F43F5E" : "#3B82F6"} />
                                    ))}
                                </Bar>
                                {className !== "all" && (
                                    <ReferenceLine y={capacity} stroke="#F43F5E" strokeDasharray="5 5" strokeWidth={2} />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '20px', borderRadius: '24px', backgroundColor: pageHasWarning ? '#fff1f2' : '#eff6ff', border: `1px solid ${pageHasWarning ? '#fecdd3' : '#dbeafe'}` }}>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: pageHasWarning ? '#e11d48' : '#2563eb', textTransform: 'uppercase', marginBottom: '5px' }}>최대 인원</div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: pageHasWarning ? '#e11d48' : '#1e40af' }}>{pageMax}<span style={{ fontSize: '16px' }}>명</span></div>
                        </div>
                        <div style={{ padding: '20px', borderRadius: '24px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>피크 타임</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>{peakStr}</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '40px', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    * 본 분석 리포트는 {selectedDay}요일 데이터를 {caregiverStart}~{caregiverEnd} 근무시간 기준으로 집계한 결과입니다.
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Hidden container for PDF rendering - absolute position off screen */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <div ref={hiddenReportRef}>
                    {/* Overall Page */}
                    <ReportPage
                        title={`${selectedDay}요일 돌봄교실 전체 운영 현황`}
                        className="all"
                        chartData={getChartDataForClass("all")}
                        capacity={999}
                    />
                    {/* Individal Classes Pages */}
                    {classes.map(cls => (
                        <ReportPage
                            key={cls}
                            title={`${selectedDay}요일 [${cls}] 운영 현황`}
                            className={cls}
                            chartData={getChartDataForClass(cls)}
                            capacity={getClassCapacity(cls)}
                        />
                    ))}
                </div>
            </div>

            {/* Control Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        분석 대시보드
                    </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-600">근무: {caregiverStart} ~ {caregiverEnd}</span>
                    </div>
                    <Button
                        variant="default"
                        className="h-11 gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 font-bold px-6"
                        onClick={exportComprehensivePDF}
                        disabled={isExporting}
                    >
                        <FileDown className="h-4 w-4" />
                        <span>종합 리포트 출력 (전체 교실 포함)</span>
                    </Button>
                </div>
            </div>

            {/* Interactive Dashboard View */}
            <Card ref={chartRef} className="overflow-hidden border-none shadow-xl bg-white">
                <CardHeader className="border-b bg-slate-50/50 px-6 py-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">실시간 인원 분석</CardTitle>
                                    {hasWarning && (
                                        <div className="flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black text-white animate-bounce shadow-lg shadow-rose-100">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            한도 초과 감지
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-slate-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-xs font-bold">{selectedDay}요일 • {selectedClass === 'all' ? '전체 교실' : selectedClass}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">대상 교실</span>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="w-[160px] h-11 bg-white border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm transition-all hover:border-blue-400">
                                        <SelectValue placeholder="교실 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200">
                                        <SelectItem value="all" className="font-bold">전체 교실 합계</SelectItem>
                                        {classes.map((c) => (
                                            <SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">분석 요일</span>
                                <Select value={selectedDay} onValueChange={setSelectedDay}>
                                    <SelectTrigger className="w-[120px] h-11 bg-white border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm transition-all hover:border-blue-400">
                                        <SelectValue placeholder="요일" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200">
                                        {WEEKDAYS.map((day) => (
                                            <SelectItem key={day} value={day} className="font-bold">{day}요일</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8">
                    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
                        {/* Main Bar Chart */}
                        <div className="h-[400px] w-full rounded-3xl bg-slate-50/50 p-6 border border-slate-100 shadow-inner overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={currentChartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
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
                                        {currentChartData.map((entry, index) => (
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
                                    {hasWarning && (
                                        <div className="mt-4 p-3 bg-white/60 rounded-2xl flex items-center gap-2 text-rose-700 text-[11px] font-bold leading-tight">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            수용 한도 초과 구역이 감지되었습니다.
                                        </div>
                                    )}
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
                                                <p className="text-[10px] text-slate-400 leading-normal italic mt-2">
                                                    * {selectedClass}의 설정값 기준입니다.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100">
                                                <ClipboardCheck className="h-4 w-4 text-blue-500" />
                                                <span className="text-[10px] font-bold text-slate-500 italic">교실별 개별 분석은 상단에서 선택 가능합니다.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CareAnalytics;
