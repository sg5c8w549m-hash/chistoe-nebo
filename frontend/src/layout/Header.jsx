import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header
      style={{
        padding: "16px 24px",
        background: "#1e293b",
        color: "white",
        display: "flex",
        gap: 20,
      }}
    >
      <strong>Чистое Небо</strong>
      <Link style={{ color: "white" }} to="/">Главная</Link>
      <Link style={{ color: "white" }} to="/status">Статус</Link>
      <Link style={{ color: "white" }} to="/about">О проекте</Link>
    </header>
  );
}
