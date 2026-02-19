export interface StudentRecord {
  id: string;
  studentName: string;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  outingTime: string;
  actualCareMinutes: number;
}

export function parseTimeToMinutes(time: any): number {
  if (time === undefined || time === null || time === "" || time === "-") return 0;

  if (typeof time === "number") {
    // Excel fractional time or serial date-time
    if (time < 1 || time > 1000) {
      return Math.round((time % 1) * 24 * 60);
    }
    return Math.round(time); // Treat as plain minutes
  }

  const str = String(time).trim().replace(/\s/g, "");

  // 1. Handle time ranges like "14:00~15:00" or "14:00-15:00"
  if (str.includes("~") || (str.includes("-") && !str.startsWith("-"))) {
    const parts = str.split(/[~-]/);
    if (parts.length === 2) {
      const start = parseTimeToMinutes(parts[0]);
      const end = parseTimeToMinutes(parts[1]);
      if (start > 0 && end > start) return end - start;
    }
  }

  // 2. Handle Korean duration "1시간 30분" or "90분"
  const hourMatch = str.match(/(\d+(?:\.\d+)?)시간/);
  const minMatch = str.match(/(\d+)분/);
  if (hourMatch || minMatch) {
    let total = 0;
    if (hourMatch) total += parseFloat(hourMatch[1]) * 60;
    if (minMatch) total += parseInt(minMatch[1]);
    return Math.round(total);
  }

  // 3. Handle HH:MM:SS or HH:MM
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }

  // 4. Handle Korean clock time "12시 30분"
  const matchK = str.match(/(\d{1,2})시(?:(\d{1,2})분)?/);
  if (matchK) {
    let h = parseInt(matchK[1]);
    const m = matchK[2] ? parseInt(matchK[2]) : 0;
    const isPM = str.includes("오후") || str.toUpperCase().includes("PM");
    if (isPM && h < 12) h += 12;
    if (!isPM && (str.includes("오전") || str.toUpperCase().includes("AM")) && h === 12) h = 0;
    return h * 60 + m;
  }

  // 5. Handle AM/PM or 오전/오후 with HH:MM
  const isPM = str.includes("오후") || str.toUpperCase().includes("PM");
  const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = parseInt(timeMatch[2]);
    if (isPM && h < 12) h += 12;
    if (!isPM && (str.includes("오전") || str.toUpperCase().includes("AM")) && h === 12) h = 0;
    return h * 60 + m;
  }

  // 6. Handle plain number as minutes
  const intNum = parseInt(str);
  if (!isNaN(intNum) && !str.includes(":")) return intNum;

  return 0;
}

export function normalizeTime(val: any): string {
  if (val === undefined || val === null || val === "" || val === "-") return "-";

  const totalMinutes = parseTimeToMinutes(val);
  if (totalMinutes === 0 && val !== "0" && val !== 0 && val !== "00:00") {
    return String(val);
  }

  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function minutesToHHMM(minutes: number): string {
  if (minutes <= 0) return "0시간 0분";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}

export function calculateActualCareTime(
  startTime: string,
  endTime: string,
  outingTime: string
): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const outing = parseTimeToMinutes(outingTime);

  const duration = end >= start ? end - start : (24 * 60 - start) + end;
  const result = duration - outing;
  return Math.max(0, result);
}
