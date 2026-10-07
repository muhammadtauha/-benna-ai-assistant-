import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi, type BackendUserDetail } from "@/lib/api-auth";
import {
  getStoredAuthSession,
  subscribeToAuthSession,
} from "@/lib/auth-session";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: BackendUserDetail | null;
  login: (email: string, password: string) => Promise<void>;
  register: (p: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<BackendUserDetail | null>(
    () => (getStoredAuthSession()?.userDetail as BackendUserDetail) ?? null,
  );

  useEffect(
    () =>
      subscribeToAuthSession((payload) => {
        if (!payload || payload.type === "logout") setUser(null);
        else setUser((getStoredAuthSession()?.userDetail as BackendUserDetail) ?? null);
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const payload = await authApi.login(email, password);
    authApi.establishSession(payload);
    setUser(payload.userDetail);
  }, []);

  const register = useCallback(
    async (p: { name: string; email: string; phone?: string; password: string }) => {
      const payload = await authApi.register(p);
      authApi.establishSession(payload);
      setUser(payload.userDetail);
    },
    [],
  );

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!user, user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
