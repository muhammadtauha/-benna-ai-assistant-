// Auth calls matching the standalone backend (backend/routes/users.js).
import { apiClient } from "./api-client";
import {
  setStoredAuthSession,
  clearStoredAuthSession,
  getStoredAuthSession,
  type AuthSessionState,
} from "./auth-session";

export interface BackendUserDetail {
  _id: string;
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  roleId?: number;
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface AuthPayload {
  token: string;
  userDetail: BackendUserDetail;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient<Envelope<AuthPayload>>("/users/auth/customer/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        deviceType: 1,
        origin: "benna-assistant",
      }),
    });
    if (!res.success || !res.data) throw new Error(res.message || "Login failed");
    return res.data;
  },

  register: async (params: { name: string; email: string; phone?: string; password: string }) => {
    const res = await apiClient<Envelope<AuthPayload>>("/users/auth/registration", {
      method: "POST",
      body: JSON.stringify({ ...params, email: params.email.trim().toLowerCase() }),
    });
    if (!res.success || !res.data) throw new Error(res.message || "Registration failed");
    return res.data;
  },

  me: () => apiClient<Envelope<{ userDetail: BackendUserDetail }>>("/users/auth/me"),

  establishSession: (payload: AuthPayload): AuthSessionState => {
    const session = { token: payload.token, userDetail: payload.userDetail } as AuthSessionState;
    setStoredAuthSession(session);
    return session;
  },

  logout: () => clearStoredAuthSession(),
  getSession: () => getStoredAuthSession(),
};
