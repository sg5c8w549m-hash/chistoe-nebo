import { useState } from "react";
import { createOrder } from "../api/orders";
import { WASTE_TYPES } from "../utils/wasteTypes";

export default function CreateOrder() {
  const [wasteKey, setWasteKey] = useState("");
  const [subType, setSubType] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState(0);
  const [address, setAddress] = useState("");

  const waste = wasteKey ? WASTE_TYPES[wasteKey as keyof typeof WASTE_TYPES] : null;

  async function submit() {
    if (!wasteKey || !quantity || !address) {
      alert("Заполните обязательные поля");
      return;
    }

    await createOrder({
      wasteType: waste?.label || "",
      subType,
      quantity,
      unit,
      address,
    });

    setWasteKey("");
    setSubType("");
    setUnit("kg");
    setQuantity(0);
    setAddress("");
  }

  return (
    <div>
      <h3>Создать заявку</h3>

      {/* Вид отходов */}
      <select value={wasteKey} onChange={(e) => setWasteKey(e.target.value)}>
        <option value="">Выберите вид отходов</option>
        {Object.entries(WASTE_TYPES).map(([key, v]) => (
          <option key={key} value={key}>
            {v.label}
          </option>
        ))}
      </select>

      <br /><br />

      {/* Подвид */}
      {waste && waste.subtypes.length > 0 && (
        <>
          <select value={subType} onChange={(e) => setSubType(e.target.value)}>
            <option value="">Выберите подвид</option>
            {waste.subtypes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <br /><br />
        </>
      )}

      {/* Количество + единицы */}
      {waste && (
        <>
          <input
            type="number"
            placeholder="Количество"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />

          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {waste.units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <br /><br />
        </>
      )}

      {/* Адрес */}
      <input
        placeholder="Адрес вывоза"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <br /><br />

      <button onClick={submit}>Отправить заявку</button>
    </div>
  );
}
