import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function DriverOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE}/orders`);
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  };

  const nextStep = async (id: string, status: string) => {
    await fetch(`${API_BASE}/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">Для водителя</h2>

      <button onClick={load} className="px-3 py-1 border rounded w-fit text-sm">
        Обновить
      </button>

      <div className="border rounded">
        {loading ? (
          <div className="p-3 text-sm">Загрузка...</div>
        ) : orders.length === 0 ? (
          <div className="p-3 text-gray-600">Нет заявок</div>
        ) : (
          <ul>
            {orders.map((o: any) => (
              <li key={o._id} className="border-b p-3 text-sm">
                <div className="font-semibold">{o.type}</div>
                <div>{o.address}</div>
                <div className="font-semibold">{o.price} ₸</div>

                <div className="flex gap-2 mt-2">
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => nextStep(o._id, "accepted")}
                  >
                    Принять
                  </button>
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => nextStep(o._id, "in_progress")}
                  >
                    В работу
                  </button>
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => nextStep(o._id, "completed")}
                  >
                    Завершить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
