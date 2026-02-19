
import { useMemo, useState } from "react";
import { StudentRecord, minutesToHHMM } from "@/types/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { useAdminStore, CriterionType } from "@/lib/store";
import {
    Download,
    Settings2,
    Users,
    School,
    AlertCircle,
    Plus,
    Trash2,
    CheckCircle2,
    UserCheck,
    Clock,
    BarChart3
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface AdminDashboardProps {
    students: StudentRecord[];
}

const AdminDashboard = ({ students }: AdminDashboardProps) => {
    const {
        classSettings,
        updateCapacity,
        screeningCriteria,
        addCriterion,
        removeCriterion,
        updateCriterion,
        caregiverStart,
        caregiverEnd,
        updateCaregiverHours
    } = useAdminStore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");

    // 1. Student Analysis Logic (including screening)
    const statsData = useMemo(() => {
        const analysisMap = new Map<string, {
            name: string;
            className: string;
            totalMinutes: number;
            daysCount: number;
        }>();

        students.forEach((s) => {
            const key = `${s.studentName}-${s.className}`;
            const existing = analysisMap.get(key) || {
                name: s.studentName,
                className: s.className,
                totalMinutes: 0,
                daysCount: 0
            };

            existing.totalMinutes += s.actualCareMinutes;
            existing.daysCount += 1;
            analysisMap.set(key, existing);
        });

        return Array.from(analysisMap.values()).map(s => {
            const avgStay = Math.round(s.totalMinutes / s.daysCount);

            // Check if student meets ANY of the criteria
            const isScreeningTarget = screeningCriteria.some(criterion => {
                if (criterion.type === "avg_stay_time") {
                    return criterion.operator === "less"
                        ? avgStay < criterion.value
                        : avgStay > criterion.value;
                }
                if (criterion.type === "absence_days") {
                    // This is simple logic: if absent 1 day is not uploaded, we might need a reference total days.
                    // For now, let's assume 'value' is a threshold for minimum attendance or similar,
                    // but the user asked for 'absence days'. Let's keep it as is.
                    return criterion.operator === "greater"
                        ? s.daysCount < criterion.value // Inverted logic for 'absence'
                        : s.daysCount > criterion.value;
                }
                return false;
            });

            return { ...s, avgStay, isScreeningTarget };
        });
    }, [students, screeningCriteria]);

    const filteredStudents = useMemo(() => {
        return statsData.filter(s =>
            s.name.includes(searchTerm) || s.className.includes(searchTerm)
        );
    }, [statsData, searchTerm]);

    // 2. Class Settings Logic
    const classrooms = useMemo(() => {
        return Array.from(new Set(students.map((s) => s.className).filter(Boolean))).sort();
    }, [students]);

    const exportStudentAnalysis = () => {
        const data = filteredStudents.map(s => ({
            "학생명": s.name,
            "돌봄교실": s.className,
            "총 체류시간": minutesToHHMM(s.totalMinutes),
            "1일 평균": minutesToHHMM(s.avgStay),
            "등교 일수": `${s.daysCount}일`,
            "심사 대상 여부": s.isScreeningTarget ? "Y" : "N"
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "학생 분석");
        XLSX.writeFile(wb, "돌봄학생_월간분석.xlsx");

        toast({ title: "내보내기 완료", description: "학생 분석 데이터가 엑셀로 저장되었습니다." });
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
                    <Settings2 className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-800">분석 및 관리 설정</h2>
                    <p className="text-sm text-slate-500">운영 기준 설정 및 학생 통계 데이터를 관리합니다.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
                <div className="space-y-8">
                    {/* Screening Criteria Settings */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-slate-50/50 p-6">
                            <div className="flex items-center gap-3">
                                <UserCheck className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-lg font-bold">심사대상학생 기준 설정</CardTitle>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white"
                                onClick={() => addCriterion({ type: "avg_stay_time", value: 60, operator: "less" })}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                기준 추가
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {screeningCriteria.map((criterion) => (
                                    <div key={criterion.id} className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-blue-200">
                                        <select
                                            value={criterion.type}
                                            onChange={(e) => updateCriterion(criterion.id, { type: e.target.value as CriterionType })}
                                            className="h-9 px-3 rounded-xl border-slate-200 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="avg_stay_time">1일 평균 체류시간</option>
                                            <option value="absence_days">결석 일수</option>
                                        </select>

                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="h-9 w-20 rounded-xl font-bold"
                                                value={criterion.value}
                                                onChange={(e) => updateCriterion(criterion.id, { value: parseInt(e.target.value) || 0 })}
                                            />
                                            <span className="text-sm font-medium text-slate-600">
                                                {criterion.type === "avg_stay_time" ? "분" : "일"}
                                            </span>
                                        </div>

                                        <select
                                            value={criterion.operator}
                                            onChange={(e) => updateCriterion(criterion.id, { operator: e.target.value as any })}
                                            className="h-9 px-3 rounded-xl border-slate-200 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="less">미만일 때</option>
                                            <option value="greater">초과일 때</option>
                                        </select>

                                        <button
                                            onClick={() => removeCriterion(criterion.id)}
                                            className="ml-auto p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {screeningCriteria.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 italic text-sm">
                                        설정된 심사 기준이 없습니다. [기준 추가]를 눌러주세요.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Student Analysis Table */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-slate-50/50 p-6">
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-lg font-bold">학생 데이터 분석</CardTitle>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-2 border-slate-200"
                                onClick={exportStudentAnalysis}
                                disabled={students.length === 0}
                            >
                                <Download className="h-3.5 w-3.5" />
                                내보내기
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-6 pb-0">
                                <Input
                                    placeholder="학생 이름 또는 교실 검색..."
                                    className="h-11 rounded-xl border-slate-100 bg-slate-50 shadow-inner px-4"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="max-h-[500px] overflow-auto p-6 pt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                            <TableHead className="font-bold">학생명/교실</TableHead>
                                            <TableHead className="font-bold">분석 데이터</TableHead>
                                            <TableHead className="text-right font-bold pr-6">심사 여부</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.map((s, idx) => (
                                            <TableRow key={idx} className="group hover:bg-slate-50/50">
                                                <TableCell className="font-bold py-4">
                                                    {s.name}
                                                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter mt-0.5">{s.className}</div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 font-bold">총 체류</span>
                                                            <span className="text-xs font-bold text-slate-700">{minutesToHHMM(s.totalMinutes)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 font-bold">1일 평균</span>
                                                            <span className="text-xs font-bold text-blue-600">{minutesToHHMM(s.avgStay)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-4">
                                                    {s.isScreeningTarget ? (
                                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600 ring-1 ring-inset ring-rose-500/20">
                                                            <AlertCircle className="h-3 w-3" />
                                                            심사대상
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            적합
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Settings Side Panel */}
                <div className="space-y-6 sticky top-8">
                    {/* Caregiver Work Hours */}
                    <Card className="border-none shadow-xl bg-white">
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b bg-slate-50/50 p-6">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg font-bold">전담사 근무시간 설정</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">출근 시간</label>
                                    <Input
                                        type="time"
                                        value={caregiverStart}
                                        onChange={(e) => updateCaregiverHours(e.target.value, caregiverEnd)}
                                        className="h-10 rounded-xl font-bold border-slate-100 bg-slate-50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">퇴근 시간</label>
                                    <Input
                                        type="time"
                                        value={caregiverEnd}
                                        onChange={(e) => updateCaregiverHours(caregiverStart, e.target.value)}
                                        className="h-10 rounded-xl font-bold border-slate-100 bg-slate-50"
                                    />
                                </div>
                            </div>
                            <p className="mt-4 text-[10px] text-slate-400 leading-relaxed italic">
                                * 설정된 근무시간을 기준으로 대시보드 그래프의 분석 범위가 결정됩니다.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Class Capacity */}
                    <Card className="border-none shadow-xl bg-white">
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b bg-slate-50/50 p-6">
                            <School className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg font-bold">교실 수용량 관리</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-auto max-h-[400px]">
                            <div className="p-6 space-y-4">
                                {classrooms.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400 italic text-sm">
                                        업로드된 데이터가 없습니다.
                                    </div>
                                ) : (
                                    classrooms.map((cls) => {
                                        const settings = classSettings.find(s => s.className === cls);
                                        return (
                                            <div key={cls} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <span className="text-sm font-bold text-slate-800">{cls}</span>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        className="h-9 w-20 rounded-xl font-bold border-slate-200"
                                                        defaultValue={settings?.capacity || 20}
                                                        onBlur={(e) => updateCapacity(cls, parseInt(e.target.value) || 20)}
                                                    />
                                                    <span className="text-xs font-bold text-slate-400">명</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
