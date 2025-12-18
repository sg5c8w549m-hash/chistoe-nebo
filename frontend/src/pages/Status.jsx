import { useEffect, useState } from "react";

export default function Status() {
  const [status, setStatus] = useState("загрузка...");

  useEffect(() => {
    fetch("/health")
      .then(r => r.json())
      .then(data => setStatus(JSON.stringify(data, null, 2)))
      .catch(() => setStatus("backend недоступен"));
  }, []);

  return (
    <div>
      <h2>Статус системы</h2>
      <pre>{status}</pre>
    </div>
  );
}
