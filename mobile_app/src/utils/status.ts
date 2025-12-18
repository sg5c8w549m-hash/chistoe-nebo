 /* src/utils/status.ts */
export type RawStatus = string | null | undefined;
export type NormalizedStatus = "new"|"accepted"|"in_progress"|"completed"|"canceled"|"unknown";

const map: Record<string, NormalizedStatus> = {
  new: "new", created: "new", "новая": "new", 
  accepted: "accepted", "принята": "accepted",
  in_progress: "in_progress", "in-progress": "in_progress", "в работе": "in_progress",
  completed: "completed", done: "completed", "завершена": "completed",
  canceled: "canceled", cancelled: "canceled", "отменена": "canceled",
};

export function normalizeStatus(raw: RawStatus): NormalizedStatus {
  if (!raw) return "unknown";
  const s = String(raw).trim().toLowerCase(); 
  return map[s] ?? "unknown";
}

export function statusLabelRus(s: NormalizedStatus): string {
  switch (s) {
    case "new": return "Новая";
    case "accepted": return "Принята";
    case "in_progress": return "В работе";
    case "completed": return "Завершена";
    case "canceled": return "Отменена";
    default: return "Неизвестно";
  }
}

export function statusBadgeClass(s: NormalizedStatus): string {
  switch (s) {
    case "new": return "bg-blue-50 text-blue-700 border border-blue-100";
    case "accepted": return "bg-yellow-50 text-yellow-800 border border-yellow-100";
    case "in_progress": return "bg-indigo-50 text-indigo-800 border border-indigo-100";
    case "completed": return "bg-green-50 text-green-700 border border-green-100";
    case "canceled": return "bg-red-50 text-red-700 border border-red-100";
    default: return "bg-gray-50 text-gray-700 border border-gray-100";
  }
}
