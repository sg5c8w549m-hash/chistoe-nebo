import { useEffect, useState } from "react";

type Health = {
  status?: string;
  env?: string;
  mongo?: string;
  error?: string;
};

function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ error: "backend недоступен" }));
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
      <h1>Чистое Небо ☁️</h1>
      <p>Vite Frontend работает</p>

      <h3>Backend health:</h3>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  );
}

export default App;
