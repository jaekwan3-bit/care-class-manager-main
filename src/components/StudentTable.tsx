import { useState, useMemo } from "react";
import { StudentRecord, minutesToHHMM } from "@/types/student";
import { Search, Users } from "lucide-react";

interface StudentTableProps {
  data: StudentRecord[];
}

const StudentTable = ({ data }: StudentTableProps) => {
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState<string>("전체");

  const days = useMemo(() => {
    const unique = [...new Set(data.map((d) => d.dayOfWeek).filter(Boolean))];
    return ["전체", ...unique];
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((s) => {
      const matchSearch = s.studentName.includes(search) || s.className.includes(search);
      const matchDay = filterDay === "전체" || s.dayOfWeek === filterDay;
      return matchSearch && matchDay;
    });
  }, [data, search, filterDay]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
        <Users className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">학생 데이터가 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">엑셀 파일을 업로드하여 시작하세요</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">학생 목록</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="이름 또는 교실 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">학생명</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">돌봄교실</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">요일</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">시작시간</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">귀가시간</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">외출시간</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">실제 체류시간</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b last:border-b-0 transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{s.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {s.dayOfWeek}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.startTime}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.endTime}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.outingTime || "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {minutesToHHMM(s.actualCareMinutes)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        총 {filtered.length}명 {filterDay !== "전체" && `(${filterDay})`}
      </div>
    </div>
  );
};

export default StudentTable;
