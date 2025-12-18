import { useState } from "react";
import type { FormEvent } from "react";

type FeedbackFormProps = {
  onSuccess: () => void;
};

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, rating })
      });

      if (!res.ok) throw new Error();

      setName("");
      setMessage("");
      setRating(5);
      setStatus("success");
      onSuccess(); // 🔥 важно
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 400 }}>
      <h2>Оставить отзыв</h2>

      <input
        placeholder="Ваше имя"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />

      <textarea
        placeholder="Ваш отзыв"
        value={message}
        onChange={e => setMessage(e.target.value)}
        required
      />

      <label>Оценка:</label>
      <select value={rating} onChange={e => setRating(Number(e.target.value))}>
        {[1, 2, 3, 4, 5].map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      <button type="submit">Отправить</button>

      {status === "loading" && <p>Отправка...</p>}
      {status === "success" && <p>Спасибо за отзыв 🌱</p>}
      {status === "error" && <p>Ошибка</p>}
    </form>
  );
};

export default FeedbackForm;
