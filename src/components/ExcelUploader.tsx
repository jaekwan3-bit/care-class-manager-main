import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { StudentRecord, calculateActualCareTime, normalizeTime } from "@/types/student";
import { useToast } from "@/hooks/use-toast";

interface ExcelUploaderProps {
  onDataLoaded: (data: StudentRecord[]) => void;
}

const ExcelUploader = ({ onDataLoaded }: ExcelUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const templateData = [
      {
        "학생명": "홍길동",
        "돌봄교실명": "햇살반",
        "요일": "월, 수, 금",
        "참여 시작시간": "13:00",
        "귀가시간": "17:00",
        "외출시간": "14:00~15:00",
      },
      {
        "학생명": "김철수",
        "돌봄교실명": "바다반",
        "요일": "화, 목",
        "참여 시작시간": "13:30",
        "귀가시간": "16:30",
        "외출시간": "30분",
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "양식");
    XLSX.writeFile(wb, "돌봄교실_관리_양식.xlsx");

    toast({
      title: "양식 다운로드 완료",
      description: "엑셀 양식 파일이 다운로드되었습니다.",
    });
  };

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast({
          title: "지원하지 않는 파일 형식",
          description: "엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

          if (json.length === 0) {
            toast({ title: "빈 파일", description: "데이터가 없는 파일입니다.", variant: "destructive" });
            return;
          }

          const findValue = (row: any, ...potentialKeys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const pKey of potentialKeys) {
              // Try exact match
              if (row[pKey] !== undefined && row[pKey] !== "") return row[pKey];

              // Try match ignoring spaces and case
              const normalizedPKey = pKey.replace(/\s/g, "").toLowerCase();
              const foundKey = rowKeys.find(rk => rk.replace(/\s/g, "").toLowerCase() === normalizedPKey);
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== "") return row[foundKey];
            }
            return "";
          };

          const records: StudentRecord[] = json.map((row, i) => {
            const studentName = String(findValue(row, "학생명", "학생 이름", "이름")).trim();
            const className = String(findValue(row, "돌봄교실명", "돌봄교실", "교실명", "교실")).trim();
            const dayOfWeek = String(findValue(row, "요일")).trim();
            const startTime = normalizeTime(findValue(row, "참여 시작시간", "시작시간", "시작", "입실시간", "참여시간"));
            const endTime = normalizeTime(findValue(row, "귀가시간", "귀가", "퇴실시간", "하교시간"));
            const outingTime = normalizeTime(findValue(row, "외출시간", "외출시간(방과후학교 등)", "외출"));

            return {
              id: `student-${i}`,
              studentName,
              className,
              dayOfWeek,
              startTime,
              endTime,
              outingTime,
              actualCareMinutes: calculateActualCareTime(startTime, endTime, outingTime),
            };
          });

          onDataLoaded(records);
          toast({
            title: "업로드 완료",
            description: `${records.length}명의 학생 데이터를 불러왔습니다.`,
          });
        } catch (error) {
          console.error("Excel parsing error:", error);
          toast({ title: "파일 읽기 오류", description: `파일을 읽는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onDataLoaded, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">엑셀 파일 업로드</h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadTemplate();
          }}
          className="group flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
          양식 다운로드
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
        onClick={() => document.getElementById("excel-input")?.click()}
      >
        <Upload className={`mb-3 h-10 w-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-sm font-medium text-foreground">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          .xlsx, .xls, .csv 파일 지원
        </p>
        {fileName && (
          <p className="mt-3 text-sm font-medium text-primary">📎 {fileName}</p>
        )}
        <input
          id="excel-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          엑셀 파일에 <span className="font-medium text-foreground">학생명, 돌봄교실명, 요일, 참여 시작시간, 귀가시간, 외출시간</span> 열이 포함되어야 합니다. 시간은 HH:MM 형식으로 입력해 주세요.
        </p>
      </div>
    </div>
  );
};

export default ExcelUploader;
