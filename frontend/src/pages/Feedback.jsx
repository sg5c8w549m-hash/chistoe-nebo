import { useState } from "react";

export default function Feedback() {
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setSaved(message);
    setMessage("");
  }

  return (
    <div>
      <h2>Обратная связь</h2>

      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите сообщение..."
          rows={4}
          style={{ width: "100%", padding: 8 }}
        />

        <button style={{ marginTop: 12 }}>Отправить</button>
      </form>

      {saved && (
        <div style={{ marginTop: 20 }}>
          <strong>Сохранено:</strong>
          <p>{saved}</p>
        </div>
      )}
    </div>
  );
}
