import { useState } from "react";
import { createOrder } from "@/api/orders";
import { WASTE_TYPES } from "@/utils/wasteTypes";
import type { WasteType } from "@/utils/wasteTypes";

export default function CreateOrderPage() {
  const [wasteKey, setWasteKey] = useState<string>("");
  const [subType, setSubType] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");
  const [quantity, setQuantity] = useState<number>(0);
  const [address, setAddress] = useState<string>("");

  const waste: WasteType | null = wasteKey
    ? WASTE_TYPES[wasteKey]
    : null;

  async function submit() {
    if (!waste || !quantity || !address) {
      alert("Заполните обязательные поля");
      return;
    }

    await createOrder({
      wasteType: waste.label,
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
    <div style={{ padding: 16 }}>
      <h3>Создать заявку</h3>

      {/* Вид отходов */}
      <select
        value={wasteKey}
        onChange={(e) => setWasteKey(e.target.value)}
      >
        <option value="">Выберите вид отходов</option>

        {(
          Object.entries(WASTE_TYPES) as [string, WasteType][]
        ).map(([key, value]) => (
          <option key={key} value={key}>
            {value.label}
          </option>
        ))}
      </select>

      <br /><br />

      {/* Подвид */}
      {waste && waste.subtypes.length > 0 && (
        <>
          <select
            value={subType}
            onChange={(e) => setSubType(e.target.value)}
          >
            <option value="">Выберите подвид</option>

            {waste.subtypes.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <br /><br />
        </>
      )}

      {/* Количество и единицы */}
      {waste && (
        <>
          <input
            type="number"
            placeholder="Количество"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            {waste.units.map((u: string) => (
              <option key={u} value={u}>
                {u}
              </option>
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
