import { useEffect, useState } from "react";
import { getOrders } from "../api/orders";
import type { Order } from "../api/orders";


export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Мои заявки</h2>

      {orders.length === 0 && <div>Заявок пока нет</div>}

      {orders.map((o) => (
        <div
          key={o.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div><b>Тип:</b> {o.wasteType}</div>
          {o.subType && <div><b>Подтип:</b> {o.subType}</div>}
          <div><b>Количество:</b> {o.quantity} {o.unit}</div>
          <div><b>Адрес:</b> {o.address}</div>
          <div><b>Статус:</b> {o.status}</div>
        </div>
      ))}
    </div>
  );
}
