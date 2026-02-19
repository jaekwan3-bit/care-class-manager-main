
import { useState, useMemo } from "react";
import {
  Users,
  Clock,
  School,
  CalendarDays,
  LayoutDashboard,
  Upload,
  UserRoundSearch,
  BarChart3,
  Settings2,
  Menu,
  X
} from "lucide-react";
import ExcelUploader from "@/components/ExcelUploader";
import StudentTable from "@/components/StudentTable";
import CareAnalytics from "@/components/CareAnalytics";
import AdminDashboard from "@/components/AdminDashboard";
import StatCard from "@/components/StatCard";
import { StudentRecord, minutesToHHMM } from "@/types/student";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["월", "화", "수", "목", "금"];

const Index = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const today = new Date();
  const todayDayIndex = today.getDay(); // 0=Sun
  const todayKorean = todayDayIndex >= 1 && todayDayIndex <= 5 ? WEEKDAYS[todayDayIndex - 1] : null;

  const stats = useMemo(() => {
    const totalStudents = new Set(students.map((s) => s.studentName)).size;
    const totalClasses = new Set(students.map((s) => s.className).filter(Boolean)).size;
    const todayStudents = todayKorean
      ? students.filter((s) => s.dayOfWeek.includes(todayKorean!))
      : [];
    const avgCareMinutes =
      students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.actualCareMinutes, 0) / students.length)
        : 0;

    return { totalStudents, totalClasses, todayCount: todayStudents.length, avgCareMinutes };
  }, [students, todayKorean]);

  const menuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "upload", label: "데이터 업로드", icon: Upload },
    { id: "students", label: "학생 분석", icon: UserRoundSearch },
    { id: "classes", label: "교실 통계", icon: BarChart3 },
    { id: "settings", label: "관리 설정", icon: Settings2 },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="전체 학생"
                value={stats.totalStudents}
                icon={<Users className="h-5 w-5" />}
                variant="primary"
                description="등록된 누적 학생 수"
              />
              <StatCard
                title="운영 교실"
                value={stats.totalClasses}
                icon={<School className="h-5 w-5" />}
                variant="accent"
                description="현재 활성 돌봄교실"
              />
              <StatCard
                title="오늘 돌봄 학생"
                value={stats.todayCount}
                icon={<CalendarDays className="h-5 w-5" />}
                variant="warning"
                description={todayKorean ? `${todayKorean}요일 기준` : "주말입니다"}
              />
              <StatCard
                title="평균 체류시간"
                value={minutesToHHMM(stats.avgCareMinutes)}
                icon={<Clock className="h-5 w-5" />}
                description="학생 1인 일일 평균"
              />
            </div>
            {students.length > 0 ? (
              <CareAnalytics data={students} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-20 text-center bg-card/30">
                <Upload className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-bold">표시할 데이터가 없습니다</h3>
                <p className="text-sm text-muted-foreground mt-1">파일 업로드 메뉴에서 엑셀 파일을 먼저 등록해 주세요.</p>
                <Button onClick={() => setActiveMenu("upload")} className="mt-6 rounded-xl">데이터 업로드하러 가기</Button>
              </div>
            )}
          </div>
        );
      case "upload":
        return <div className="animate-in slide-in-from-bottom-4 duration-500"><ExcelUploader onDataLoaded={(data) => { setStudents(data); setActiveMenu("dashboard"); }} /></div>;
      case "students":
        return <div className="animate-in fade-in duration-500"><StudentTable data={students} /></div>;
      case "classes":
      case "settings":
        return <div className="animate-in fade-in duration-500"><AdminDashboard students={students} /></div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
          <span className="font-black text-slate-800">CARE MANAGER</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="h-full flex flex-col p-6">
            <div className="hidden lg:flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <School className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-slate-800 tracking-tight leading-none">돌봄교실</span>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Care Management</span>
              </div>
            </div>

            <nav className="flex-1 space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                      ${isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    {item.label}
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 border-t">
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">현재 시스템 상태</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">관리자 모드 활성</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-8 py-8 overflow-hidden">
          <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {menuItems.find(m => m.id === activeMenu)?.label}
              </h1>
              <p className="text-slate-500 text-sm mt-1">돌봄교실 운영 현황을 스마트하게 관리하세요.</p>
            </div>

            <div className="flex items-center gap-3 bg-white border px-4 py-2.5 rounded-2xl shadow-sm">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-700">{today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
            </div>
          </header>

          <div className="pb-20">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Index;
