// 年級推導：email 前三碼 = 入學民國學年度（如 114xxx@... → 114）。
// 高中三年制；學年度每年 8 月跳新。老師/職務帳號無數字前綴 → 回 null。
//
// 年級 = 現在學年度 − 入學學年度 + 1
//   現在學年度 = 月份 >= 8 ? 民國年 : 民國年 − 1
export function deriveGrade(email: string, now: Date = new Date()): number | null {
  const m = email.match(/^(\d{3})/);
  if (!m) return null;
  const entry = Number(m[1]);
  const roc = now.getFullYear() - 1911;
  const academicYear = now.getMonth() + 1 >= 8 ? roc : roc - 1;
  const grade = academicYear - entry + 1;
  return grade >= 1 && grade <= 3 ? grade : null;
}

// 給人看的標籤：1 → 高一、2 → 高二、3 → 高三；其餘原樣回數字字串。
export function gradeLabel(grade: number | null): string | null {
  if (grade === null) return null;
  const zh = ["一", "二", "三"][grade - 1];
  return zh ? `高${zh}` : String(grade);
}
