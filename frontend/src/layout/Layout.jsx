import Header from "./Header";

export default function Layout({ children }) {
  return (
    <div>
      <Header />
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
