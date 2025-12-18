import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// если у тебя есть AuthProvider – подключаем его;
// если нет, просто оставим <App /> внутри BrowserRouter
import { AuthProvider } from "./components/AuthContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Не найден элемент с id='root' в index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* если AuthProvider есть – он оборачивает приложение */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
