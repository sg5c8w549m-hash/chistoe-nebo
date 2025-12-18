// mobile_app/src/components/OrdersList.tsx

import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

type Role = "client" | "driver" | "admin";

interface OrdersListProps {
  role: Role;
  clientId?: string;
}

type OrderStatus = "new" | "accepted" | "in_progress" | "completed" | "canceled";

interface Order {
  id?: string;
  _id?: string; // на всякий случай, если останутся старые записи
  customerId?: string;
  driverId?: string | null;
  receivingPointId?: string | null;

  customerName?: string | null;
  customerPhone?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  receivingOrg?: string | null;
  receivingOrgCity?: string | null;
  receivingOrgAddress?: string | null;
  receivingOrgPhone?: string | null;

  wasteType: string;
  quantity: number;
  quantityUnit: "kg" | "t";
  address: string;
  desiredAt?: string | null;
  comment?: string | null;
  clientId?: string;
  status: OrderStatus;

  amount?: number | null;
  amountCurrency?: string;

  createdAt?: string;
  updatedAt?: string;
}

const statusLabels: Record<OrderStatus, string> = {
  new: "Новая",
  accepted: "Принята",
  in_progress: "В работе",
  completed: "Завершена",
  canceled: "Отменена",
};

const statusColors: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  accepted: "bg-emerald-100 text-emerald-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-slate-200 text-slate-800",
  canceled: "bg-red-100 text-red-700",
};

const OrdersList: React.FC<OrdersListProps> = ({ role, clientId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Подписка на событие "orders:created" (чтобы обновлять список)
  useEffect(() => {
    const handler = () => setRefreshTrigger((x) => x + 1);
    window.addEventListener("orders:created", handler);
    return () => window.removeEventListener("orders:created", handler);
  }, []);

  // Загрузка списка заявок
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append("role", role);
        if (role === "client" && clientId) {
          params.append("clientId", String(clientId));
        }

        const res = await fetch(`${API_BASE}/api/orders?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Ошибка загрузки заявок:", err);
        setError("Не удалось загрузить список заявок");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [role, clientId, refreshTrigger]);

  const handleChangeStatus = async (order: Order, newStatus: OrderStatus) => {
    if (!order.id && !order._id) return;
    const id = order.id || order._id;

    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const updated: Order = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id || o._id === updated._id ? updated : o))
      );
    } catch (err) {
      console.error("Ошибка обновления статуса:", err);
      alert("Не удалось обновить статус заявки");
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("ru-RU");
  };

  const formatQuantity = (order: Order) => {
    const unitLabel = order.quantityUnit === "t" ? "т" : "кг";
    return `${order.quantity} ${unitLabel}`;
  };

  const formatAmount = (order: Order) => {
    if (order.amount == null) return "—";
    const currency = order.amountCurrency || "₸";
    try {
      return `${order.amount.toLocaleString("ru-RU")} ${currency}`;
    } catch {
      return `${order.amount} ${currency}`;
    }
  };

  return (
    <div className="space-y-3">
      {loading && (
        <div className="text-sm text-slate-500">Загрузка заявок...</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <div className="text-sm text-slate-500">
          Заявок пока нет. Создайте новую заявку.
        </div>
      )}

      {orders.map((order) => {
        const id = order.id || order._id || "";
        const isDriverOrAdmin = role === "driver" || role === "admin";

        return (
          <div
            key={id}
            className="border rounded-xl p-3 sm:p-4 bg-white shadow-sm flex flex-col gap-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-sm sm:text-base text-slate-900">
                {order.wasteType || "Не указан вид отходов"}
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[order.status]
                }`}
              >
                {statusLabels[order.status]}
              </span>
            </div>

            {/* Кол-во, сумма, адрес */}
            <div className="text-xs sm:text-sm text-slate-700 space-y-1">
              <div>
                <span className="font-medium">Количество:</span>{" "}
                {formatQuantity(order)}
              </div>
              <div>
                <span className="font-medium">Оценочная стоимость:</span>{" "}
                {formatAmount(order)}
              </div>
              <div>
                <span className="font-medium">Адрес вывоза:</span>{" "}
                {order.address}
              </div>
              {order.receivingOrg && (
                <div>
                  <span className="font-medium">Пункт приёма:</span>{" "}
                  {order.receivingOrg}
                  {order.receivingOrgCity && `, ${order.receivingOrgCity}`}
                </div>
              )}
            </div>

            {/* Заказчик / водитель */}
            <div className="text-xs sm:text-sm text-slate-500 space-y-1">
              {order.customerName && (
                <div>
                  <span className="font-medium text-slate-600">Заказчик:</span>{" "}
                  {order.customerName}
                  {order.customerPhone && ` (${order.customerPhone})`}
                </div>
              )}
              {order.driverName && (
                <div>
                  <span className="font-medium text-slate-600">Водитель:</span>{" "}
                  {order.driverName}
                  {order.driverPhone && ` (${order.driverPhone})`}
                </div>
              )}
            </div>

            {/* Даты */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-400">
              <div>
                Создана:{" "}
                <span className="font-medium">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
              {order.desiredAt && (
                <div>
                  Желаемое время:{" "}
                  <span className="font-medium">
                    {order.desiredAt || "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Кнопки смены статуса для водителя/админа */}
            {isDriverOrAdmin && (
              <div className="pt-1 flex flex-wrap gap-2">
                {order.status !== "accepted" && order.status !== "completed" && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md bg-emerald-600 text-white text-xs"
                    onClick={() => handleChangeStatus(order, "accepted")}
                  >
                    Принять
                  </button>
                )}
                {order.status === "accepted" && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md bg-amber-500 text-white text-xs"
                    onClick={() => handleChangeStatus(order, "in_progress")}
                  >
                    В работе
                  </button>
                )}
                {order.status !== "completed" && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md bg-slate-700 text-white text-xs"
                    onClick={() => handleChangeStatus(order, "completed")}
                  >
                    Завершить
                  </button>
                )}
                {order.status !== "canceled" && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md bg-red-500 text-white text-xs"
                    onClick={() => handleChangeStatus(order, "canceled")}
                  >
                    Отменить
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrdersList;
