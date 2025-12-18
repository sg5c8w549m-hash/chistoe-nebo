import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type OrderStatus =
  | "new"
  | "accepted"
  | "in_progress"
  | "completed"
  | "canceled";

export interface Order {
  _id: string;
  type: string;
  description?: string;
  address: string;
  status: OrderStatus;
  price?: number;
  createdAt?: string;
}

const statusLabels: Record<OrderStatus, string> = {
  new: "Новая",
  accepted: "Принята",
  in_progress: "В работе",
  completed: "Завершена",
  canceled: "Отменена",
};

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [statusFilter, setStatusFilter] = useState<"" | OrderStatus>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [sortBy, setSortBy] = useState<"createdAt" | "status" | "price">(
    "createdAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const loadOrders = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);

    const res = await fetch(`${API_BASE}/orders?${params.toString()}`);
    const data = await res.json();

    setOrders(data);
    if (selectedOrder) {
      const u = data.find((o: Order) => o._id === selectedOrder._id);
      if (u) setSelectedOrder(u);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, startDate, endDate, sortBy, sortDir]);

  const exportFile = async (type: "csv" | "xlsx") => {
    const params = new URLSearchParams();

    if (statusFilter) params.append("status", statusFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);

    const res = await fetch(`${API_BASE}/orders/export/${type}?${params.toString()}`);
    const blob = await res.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const changeStatus = async (id: string, status: OrderStatus) => {
    await fetch(`${API_BASE}/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadOrders();
  };

  return (
    <div className="flex h-full gap-4">
      {/* LEFT LIST */}
      <div className="w-1/2 flex flex-col gap-3">
        {/* Фильтры */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col text-sm">
            <label className="text-gray-600 mb-1">Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="">Все</option>
              <option value="new">Новые</option>
              <option value="accepted">Принятые</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Завершённые</option>
              <option value="canceled">Отменённые</option>
            </select>
          </div>

          <div className="flex flex-col text-sm">
            <label className="text-gray-600 mb-1">От даты</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>

          <div className="flex flex-col text-sm">
            <label className="text-gray-600 mb-1">До даты</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>

          <div className="flex flex-col text-sm">
            <label className="text-gray-600 mb-1">Сортировка</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "createdAt" | "status" | "price")
                }
                className="border rounded px-2 py-1"
              >
                <option value="createdAt">По дате</option>
                <option value="status">По статусу</option>
                <option value="price">По цене</option>
              </select>
              <button
                onClick={() =>
                  setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="border rounded px-2 py-1"
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>

          <button
            onClick={loadOrders}
            className="ml-auto px-3 py-2 border rounded text-sm"
          >
            {loading ? "..." : "Обновить"}
          </button>
        </div>

        {/* EXPORT BUTTONS */}
        <div className="flex gap-2">
          <button
            onClick={() => exportFile("csv")}
            className="px-3 py-2 rounded text-sm border"
          >
            CSV
          </button>
          <button
            onClick={() => exportFile("xlsx")}
            className="px-3 py-2 rounded text-sm border"
          >
            Excel
          </button>
        </div>

        {/* LIST */}
        <div className="flex-1 border rounded overflow-auto">
          {orders.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">
              {loading ? "Загрузка..." : "Нет данных"}
            </div>
          ) : (
            <ul>
              {orders.map((o) => (
                <li
                  key={o._id}
                  onClick={() => setSelectedOrder(o)}
                  className={`px-3 py-2 border-b cursor-pointer text-sm hover:bg-gray-50 ${
                    selectedOrder?._id === o._id ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="font-semibold">{o.type}</div>
                    <div className="text-xs text-gray-500">
                      {o.createdAt &&
                        new Date(o.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">{o.address}</div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs">
                      {statusLabels[o.status] ?? o.status}
                    </span>
                    <span className="text-xs font-semibold">{o.price} ₸</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* DETAILS */}
      <div className="w-1/2 border rounded p-3 flex flex-col gap-2 text-sm">
        {!selectedOrder ? (
          <div className="text-gray-500">Выберите заявку</div>
        ) : (
          <>
            <div className="flex justify-between">
              <div>
                <div className="text-xs text-gray-500">ID</div>
                <div className="text-xs">{selectedOrder._id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Статус</div>
                <div className="font-semibold">
                  {statusLabels[selectedOrder.status]}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Тип</div>
              <div className="font-semibold">{selectedOrder.type}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Адрес</div>
              <div>{selectedOrder.address}</div>
            </div>

            {selectedOrder.description && (
              <div>
                <div className="text-xs text-gray-500">Описание</div>
                <div>{selectedOrder.description}</div>
              </div>
            )}

            <div className="flex justify-between mt-2">
              <div>
                <div className="text-xs text-gray-500">Создано</div>
                <div>
                  {selectedOrder.createdAt &&
                    new Date(selectedOrder.createdAt).toLocaleString("ru-RU")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Цена</div>
                <div className="font-semibold">{selectedOrder.price} ₸</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="px-2 py-1 border rounded text-xs"
                onClick={() => changeStatus(selectedOrder._id, "accepted")}
              >
                Принять
              </button>
              <button
                className="px-2 py-1 border rounded text-xs"
                onClick={() => changeStatus(selectedOrder._id, "in_progress")}
              >
                В работу
              </button>
              <button
                className="px-2 py-1 border rounded text-xs"
                onClick={() => changeStatus(selectedOrder._id, "completed")}
              >
                Завершить
              </button>
              <button
                className="px-2 py-1 border rounded text-xs"
                onClick={() => changeStatus(selectedOrder._id, "canceled")}
              >
                Отменить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
