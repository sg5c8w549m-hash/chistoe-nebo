import { useEffect, useState } from "react";
import { api } from "./api";

interface Log {
  date: string;
  action: string;
  details: string;
}

export default function Audit() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        setReady(true);
        clearInterval(check);
      }
    }, 100);

    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!ready) return;

    api("/api/audit")
      .then(setLogs)
      .catch(() => setLogs([]));
  }, [ready]);

  return (
    <div style={{ marginTop: 32 }}>
      <h2>Журнал действий</h2>

      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Действие</th>
            <th>Детали</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && (
            <tr>
              <td colSpan={3}>Нет записей</td>
            </tr>
          )}

          {logs.map((l, i) => (
            <tr key={i}>
              <td>{l.date.slice(0, 19).replace("T", " ")}</td>
              <td>{l.action}</td>
              <td>{l.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
