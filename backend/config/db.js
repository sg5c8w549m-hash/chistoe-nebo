# fix_chistoe.ps1
# Запуск: powershell -ExecutionPolicy Bypass -File .\fix_chistoe.ps1

# --- Настройки: путь к проекту (проверь, при необходимости поправь) ---
$projectRoot = "C:\Users\77713\Downloads\Chistoe_Nebo_full_package\mobile_app"
$src = Join-Path $projectRoot "src"

Write-Host "Работаю с проектом: $projectRoot" -ForegroundColor Cyan

# --- Вспомогательные функции ---
function Backup-IfExists($path) {
    if (Test-Path $path) {
        $ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $bak = "${path}.bak_${ts}"
        Copy-Item -Path $path -Destination $bak -Recurse -Force
        Write-Host "Backup created: $bak"
    }
}

function Ensure-Dir($dir) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir"
    } else {
        Write-Host "Exists directory: $dir"
    }
}

# --- Подготовка директорий ---
$componentsDir = Join-Path $src "components"
$apiDir = Join-Path $src "api"
$utilsDir = Join-Path $src "utils"

Ensure-Dir $componentsDir
Ensure-Dir $apiDir
Ensure-Dir $utilsDir

# --- Создаём / перезаписываем файлы api/orders.ts и utils/status.ts (с резервной копией) ---
$ordersPath = Join-Path $apiDir "orders.ts"
$statusPath = Join-Path $utilsDir "status.ts"

# backup existing
Backup-IfExists $ordersPath
Backup-IfExists $statusPath

# orders.ts content
$ordersContent = @'
/* src/api/orders.ts */
export type Order = {
  _id?: string;
  id?: string;
  status?: string;
  wasteType?: string;
  quantity?: number | string;
  unit?: string;
  receivingOrg?: string;
  address?: string;
  createdAt?: string;
  photos?: string[];
  tariffPerUnit?: number;
  totalPrice?: number;
  clientId?: string;
  [k: string]: any;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const USE_MOCK = (import.meta.env.VITE_USE_MOCK === 'true') || false;

const MOCK_ORDERS: Order[] = [
  { _id: 'm-1', status: 'new', wasteType: 'Макулатура', quantity: 2.5, unit: 'ton', receivingOrg: 'paper_plastic_1', address: 'Усть-Каменогорск, ул. Абая, д.12', createdAt: new Date().toISOString(), photos: [], tariffPerUnit: 35000, totalPrice: 35000 * 2.5, clientId: 'user-1' },
  { _id: 'm-2', status: 'accepted', wasteType: 'Пластик', quantity: 1, unit: 'ton', receivingOrg: 'paper_plastic_2', address: 'Усть-Каменогорск, пр. Назарбаева, д.5', createdAt: new Date(Date.now() - 86400000).toISOString(), photos: ['https://picsum.photos/seed/plastic/400/300'], tariffPerUnit: 38000, totalPrice: 38000, clientId: 'user-1' },
];

async function parseResponse(res: Response) {
  const text = await res.text().catch(() => '');
  if (!text) return [];
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json as Order[];
    if (Array.isArray(json.orders)) return json.orders as Order[];
    if (Array.isArray(json.data)) return json.data as Order[];
    return [json] as Order[];
  } catch {
    return [];
  }
}

export async function fetchOrders(): Promise<Order[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_ORDERS.slice();
  }
  const res = await fetch(`${API_BASE}/api/orders`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await parseResponse(res);
}

export async function orderAction(id: string, action: 'accept'|'start'|'complete'|'cancel') {
  if (USE_MOCK) {
    const idx = MOCK_ORDERS.findIndex(o => o._id === id || o.id === id);
    if (idx === -1) throw new Error('Not found (mock)');
    const cur = MOCK_ORDERS[idx];
    if (action === 'accept') cur.status = 'accepted';
    if (action === 'start') cur.status = 'in_progress';
    if (action === 'complete') cur.status = 'completed';
    if (action === 'cancel') cur.status = 'canceled';
    await new Promise(r => setTimeout(r, 150));
    return cur;
  }
  const res = await fetch(`${API_BASE}/api/orders/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  try { return await res.json(); } catch { return null; }
}
'@

Set-Content -Path $ordersPath -Value $ordersContent -Encoding UTF8
Write-Host "Wrote: $ordersPath"

# status.ts content
$statusContent = @'
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
'@

Set-Content -Path $statusPath -Value $statusContent -Encoding UTF8
Write-Host "Wrote: $statusPath"

# --- Перемещение OrdersList.tsx в components (если он в src) ---
$ordersList_src = Join-Path $src "OrdersList.tsx"
$ordersList_dst = Join-Path $componentsDir "OrdersList.tsx"

if (Test-Path $ordersList_src) {
    Backup-IfExists $ordersList_dst
    Move-Item -Path $ordersList_src -Destination $ordersList_dst -Force
    Write-Host "Moved OrdersList.tsx -> src/components/"
} elseif (-not (Test-Path $ordersList_dst)) {
    # если ни в src ни в components нет — создаём файл из шаблона
    $olContent = @'
/* src/components/OrdersList.tsx */
import React, { useEffect, useState, useMemo } from "react";
import { Order, fetchOrders, orderAction } from "../api/orders";
import { normalizeStatus, statusLabelRus, statusBadgeClass, NormalizedStatus } from "../utils/status";

type Role = "client" | "driver" | "admin";

export default function OrdersList({ role = "client" as Role, clientId }: { role?: Role; clientId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | NormalizedStatus | "unknown">("all");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const arr = await fetchOrders();
      setOrders(arr);
    } catch (e: any) {
      console.error("fetchOrders error", e);
      setError(typeof e?.message === "string" ? e.message : "Ошибка загрузки заявок");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onCreated = () => { load(); };
    window.addEventListener("orders:created", onCreated);
    return () => window.removeEventListener("orders:created", onCreated);
  }, []);

  const filtered = useMemo(() => {
    let arr = orders;
    if (clientId) arr = arr.filter((o) => String(o.clientId) === String(clientId));
    if (filter !== "all") return arr.filter((o) => normalizeStatus(o.status) === filter);
    return arr;
  }, [orders, filter, clientId]);

  const doAction = async (id: string, action: "accept" | "start" | "complete" | "cancel") => {
    setOrders((prev) => prev.map((o) => {
      if (o._id === id || o.id === id) {
        let st = normalizeStatus(o.status);
        if (action === "accept") st = "accepted";
        if (action === "start") st = "in_progress";
        if (action === "complete") st = "completed";
        if (action === "cancel") st = "canceled";
        return { ...o, status: st };
      }
      return o;
    }));
    try {
      await orderAction(id, action);
      await load();
    } catch (e) {
      console.error("Action error", e);
      await load();
      alert("Не удалось выполнить действие: " + (e as any)?.message ?? "ошибка");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button className={`px-2 py-1 rounded ${filter === "all" ? "bg-gray-800 text-white" : "border"}`} onClick={() => setFilter("all")}>Все</button>
          <button className={`px-2 py-1 rounded ${filter === "new" ? "bg-blue-600 text-white" : "border"}`} onClick={() => setFilter("new")}>Новые</button>
          <button className={`px-2 py-1 rounded ${filter === "accepted" ? "bg-yellow-600 text-white" : "border"}`} onClick={() => setFilter("accepted")}>Принятые</button>
          <button className={`px-2 py-1 rounded ${filter === "in_progress" ? "bg-indigo-700 text-white" : "border"}`} onClick={() => setFilter("in_progress")}>В работе</button>
          <button className={`px-2 py-1 rounded ${filter === "completed" ? "bg-green-600 text-white" : "border"}`} onClick={() => setFilter("completed")}>Завершённые</button>
          <button className={`px-2 py-1 rounded ${filter === "canceled" ? "bg-red-600 text-white" : "border"}`} onClick={() => setFilter("canceled")}>Отменённые</button>
        </div>
        <div className="text-sm text-gray-600">{filtered.length} заявок</div>
      </div>

      {loading && <div className="text-sm text-gray-500">Загрузка…</div>}
      {error && <div className="text-sm text-red-600">Ошибка: {error}</div>}
      {!loading && filtered.length === 0 && <div className="text-sm text-gray-500">Заявок не найдено.</div>}

      <div className="grid gap-3">
        {filtered.map((o, idx) => {
          const st = normalizeStatus(o.status);
          return (
            <div key={o._id ?? o.id ?? idx} className="bg-white p-4 rounded-2xl shadow-sm border flex gap-4">
              <div className="w-20 h-16 flex-shrink-0 overflow-hidden rounded-md border bg-gray-50">
                {o.photos && o.photos.length > 0 ? <img src={o.photos[0]} alt="photo" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Фото нет</div>}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm text-gray-500">#{o._id ?? o.id ?? "—"}</div>
                    <div className="text-lg font-semibold">{o.wasteType ?? "Отходы"}</div>
                    <div className="text-sm text-gray-600">{o.address}</div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 text-sm rounded-full ${statusBadgeClass(st)}`}>{statusLabelRus(st)}</div>
                    <div className="text-xs text-gray-500 mt-2">{o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-gray-700">
                  <div>Кол-во: <span className="font-medium">{o.quantity ?? "—"} {o.unit ?? ""}</span></div>
                  {typeof o.totalPrice === "number" && <div>Сумма: <span className="font-semibold text-emerald-700">{o.totalPrice.toLocaleString("ru-RU")} ₸</span></div>}
                  <div className="ml-auto text-xs text-gray-400">Пункт: {o.receivingOrg ?? "—"}</div>
                </div>

                <div className="mt-3 flex gap-2">
                  {role === "client" && st === "new" && <button onClick={() => doAction(o._id ?? o.id!, "cancel")} className="px-3 py-1 border rounded">Отменить</button>}
                  {role === "client" && (st === "accepted" || st === "in_progress") && <button onClick={() => alert("Контакт с исполнителем (пока заглушка)")} className="px-3 py-1 border rounded">Связаться</button>}
                  {role === "driver" && st === "new" && <button onClick={() => doAction(o._id ?? o.id!, "accept")} className="px-3 py-1 rounded bg-indigo-600 text-white">Принять</button>}
                  {role === "driver" && st === "accepted" && <button onClick={() => doAction(o._id ?? o.id!, "start")} className="px-3 py-1 rounded bg-indigo-600 text-white">Начать погрузку</button>}
                  {role === "driver" && st === "in_progress" && <button onClick={() => doAction(o._id ?? o.id!, "complete")} className="px-3 py-1 rounded bg-green-600 text-white">Завершить</button>}
                  {role === "admin" && <button onClick={() => alert("Редактировать заявку — заглушка")} className="px-3 py-1 border rounded">Редактировать</button>}
                  <button onClick={() => navigator.clipboard?.writeText(String(o._id ?? o.id ?? ""))} className="ml-auto text-xs text-gray-500 px-2 py-1 border rounded">Копировать ID</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
'@

    Set-Content -Path $ordersList_dst -Value $olContent -Encoding UTF8
    Write-Host "Created OrdersList.tsx in components/"
}

# --- Удаляем лишные одиночные 'ф' символы в App.tsx и OrdersList.tsx (если есть) ---
$appPath = Join-Path $src "App.tsx"
$olPath = $ordersList_dst

foreach ($p in @($appPath, $olPath)) {
    if (Test-Path $p) {
        $txt = Get-Content -Raw -Path $p -ErrorAction SilentlyContinue
        if ($null -ne $txt) {
            $new = $txt -replace "^[ \t]*ф[ \t\r\n]*$","" -replace "\r\nф\s*$","" -replace "\nф\s*$",""
            if ($new -ne $txt) {
                Backup-IfExists $p
                Set-Content -Path $p -Value $new -Encoding UTF8
                Write-Host "Removed stray 'ф' from: $p"
            } else {
                Write-Host "No stray 'ф' found in: $p"
            }
        }
    }
}

Write-Host "Готово. Проверьте проект в VS Code."
Write-Host "Теперь: 1) откройте VS Code, 2) Ctrl+Shift+P -> TypeScript: Restart TS Server, 3) перезапустите dev-сервер (npm run dev) если нужно." -ForegroundColor Green
