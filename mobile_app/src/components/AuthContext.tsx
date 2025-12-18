import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "../types";

type AuthState = {
  role: Role;
  userId?: string;
  name?: string;
  phone?: string;
};

type AuthContextValue = AuthState & {
  setRole: (role: Role) => void;
  loginClient: (phone: string, name?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>({
    role: "client",
  });

  const setRole = (role: Role) => {
    setState((prev) => ({ ...prev, role }));
  };

  const loginClient = async (phone: string, name?: string) => {
    const res = await fetch("http://localhost:4000/api/auth/client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name }),
    });

    if (!res.ok) {
      throw new Error("Ошибка входа клиента");
    }

    const data = await res.json();

    setState({
      role: "client",
      userId: data.userId,
      name: data.name,
      phone: data.phone,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, setRole, loginClient }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth должен вызываться внутри <AuthProvider>");
  }
  return ctx;
};
