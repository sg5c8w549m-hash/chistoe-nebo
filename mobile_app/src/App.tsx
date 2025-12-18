import { useEffect, useMemo, useState } from "react";

type Role = "client" | "driver" | "admin";
type Unit = "kg" | "ton";
type Status = "new" | "accepted" | "completed";

type Order = {
  _id?: string;
  wasteType: string;
  wasteSubtype?: string;
  quantity: number;
  unit: Unit;
  address: string;
  status: Status;
  price?: number;
  createdAt?: string;
};

const API_URL = "http://localhost:4000/api";

const wasteSubtypes: Record<string, string[]> = {
  макулатура: ["Картон", "А4", "Газеты", "Журналы", "Книги"],
  пластик: ["PET", "HDPE (ПНД)", "LDPE (ПВД)", "PP", "PS", "PVC"],
};

const tariffs: Record<string, number> = {
  макулатура: 20,
  пластик: 35,
};

export default function App() {
  const [role, setRole] = useState<Role>("client");
  const [tab, setTab] = useState("create");

  // form
  const [wasteType, setWasteType] = useState("");
  const [wasteSubtype, setWasteSubtype] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [address, setAddress] = useState("");

  // data
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // admin filters
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");

  const loadOrders = async () => {
    const res = await fetch(`${API_URL}/orders`);
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const pricePreview = useMemo(() => {
    if (!wasteType || !quantity) return 0;
    const base = tariffs[wasteType] || 0;
    const q = Number(quantity) || 0;
    return unit === "ton" ? base * q * 1000 : base * q;
  }, [wasteType, quantity, unit]);

  const submit = async () => {
    if (!wasteType || !quantity || !address) {
      alert("Заполните обязательные поля");
      return;
    }
    setLoading(true);
    await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wasteType,
        wasteSubtype,
        quantity: Number(quantity),
        unit,
        address,
        price: pricePreview,
      }),
    });
    setWasteType("");
    setWasteSubtype("");
    setQuantity("");
    setUnit("kg");
    setAddress("");
    await loadOrders();
    setLoading(false);
  };

  const changeStatus = async (id: string, status: Status) => {
    await fetch(`${API_URL}/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadOrders();
  };

  const adminList = useMemo(() => {
    return orders
      .filter((o) => (filterStatus === "all" ? true : o.status === filterStatus))
      .filter((o) =>
        search
          ? `${o.wasteType} ${o.wasteSubtype ?? ""} ${o.address}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true
      );
  }, [orders, filterStatus, search]);

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "Arial" }}>
      <h2>Чистое Небо</h2>

      <div style={{ marginBottom: 16 }}>
        Роль:&nbsp;
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="client">Заказчик</option>
          <option value="driver">Водитель</option>
          <option value="admin">Админ</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {role === "client" && (
          <>
            <button onClick={() => setTab("create")}>Создать заявку</button>
            <button onClick={() => setTab("my")}>Мои заявки</button>
          </>
        )}
        {role === "driver" && (
          <button onClick={() => setTab("driver")}>Для водителя</button>
        )}
        {role === "admin" && (
          <button onClick={() => setTab("admin")}>Админка</button>
        )}
      </div>

      {role === "client" && tab === "create" && (
        <>
          <h3>Создать заявку</h3>
          <select
            value={wasteType}
            onChange={(e) => {
              setWasteType(e.target.value);
              setWasteSubtype("");
            }}
          >
            <option value="">Вид отходов</option>
            <option value="макулатура">Макулатура</option>
            <option value="пластик">Пластик</option>
          </select>

          {wasteType && wasteSubtypes[wasteType] && (
            <select
              value={wasteSubtype}
              onChange={(e) => setWasteSubtype(e.target.value)}
            >
              <option value="">Подвид</option>
              {wasteSubtypes[wasteType].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              type="number"
              placeholder="Количество"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="kg">кг</option>
              <option value="ton">тонны</option>
            </select>
          </div>

          <input
            style={{ marginTop: 8, width: "100%" }}
            placeholder="Адрес"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div style={{ marginTop: 8 }}>💰 Стоимость: <b>{pricePreview} ₸</b></div>
          <button onClick={submit} disabled={loading}>
            {loading ? "Отправка..." : "Отправить"}
          </button>
        </>
      )}

      {role === "client" && tab === "my" && (
        <>
          <h3>Мои заявки</h3>
          {orders.map((o) => (
            <div key={o._id} style={{ border: "1px solid #ccc", padding: 10 }}>
              <div>{o.wasteType}{o.wasteSubtype ? ` / ${o.wasteSubtype}` : ""}</div>
              <div>{o.quantity} {o.unit}</div>
              <div>Цена: {o.price ?? 0} ₸</div>
              <div>Адрес: {o.address}</div>
              <div>Статус: {o.status}</div>
            </div>
          ))}
        </>
      )}

      {role === "driver" && tab === "driver" && (
        <>
          <h3>Заявки для водителя</h3>
          {orders.filter(o => o.status === "new").map((o) => (
            <div key={o._id} style={{ border: "1px solid #ccc", padding: 10 }}>
              <div>{o.wasteType}</div>
              <div>{o.quantity} {o.unit}</div>
              <div>{o.address}</div>
              <button onClick={() => changeStatus(o._id!, "accepted")}>Принять</button>
            </div>
          ))}
        </>
      )}

      {role === "admin" && tab === "admin" && (
        <>
          <h3>Админка / Мини-CRM</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="accepted">Принятые</option>
              <option value="completed">Завершённые</option>
            </select>

            <input
              placeholder="Поиск (тип / адрес)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>

          {adminList.map((o) => (
            <div key={o._id} style={{ border: "1px solid #ccc", padding: 10 }}>
              <div>
                <b>{o.wasteType}</b>{o.wasteSubtype ? ` / ${o.wasteSubtype}` : ""} — {o.quantity} {o.unit}
              </div>
              <div>Цена: {o.price ?? 0} ₸</div>
              <div>Адрес: {o.address}</div>
              <div>Статус: {o.status}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={() => changeStatus(o._id!, "new")}>new</button>
                <button onClick={() => changeStatus(o._id!, "accepted")}>accepted</button>
                <button onClick={() => changeStatus(o._id!, "completed")}>completed</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
