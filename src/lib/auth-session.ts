// src/lib/auth-session.ts — FIXED VERSION
// ======================================
// Fixes applied:
// 1. SSR-safe storage with private mode detection
// 2. crypto.randomUUID availability check + robust fallback
// 3. parseInt with radix 10 everywhere
// 4. String(null) protection via nullish checks
// 5. Cross-tab auth change with payload
// 6. Guest profile base64 obfuscation (light encryption)
// 7. Idle timeout detection (30 min)
// 8. Session fingerprinting via user agent hash
// 9. CRITICAL FIX: Token now persisted to localStorage + sessionStorage so it survives page reloads

interface BackendSessionUser {
  _id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  profilePic?: string;
}

export interface AuthSessionState {
  token: string;
  userDetail: BackendSessionUser;
}

const LEGACY_AUTH_SESSION_KEY = "benna-auth-session";
const LEGACY_AUTH_SESSION_TIMESTAMP_KEY = "benna-auth-session-ts";
const PROFILE_STORAGE_KEY = "benna-customer-profile";
const PROFILE_TIMESTAMP_KEY = "benna-customer-profile-ts";
const AUTH_SESSION_EVENT = "benna-auth-session-changed";
const GUEST_ID_KEY = "benna-guest-id";
const GUEST_PROFILE_KEY = "benna-guest-profile";
const GUEST_PROFILE_TS_KEY = "benna-guest-profile-ts";
const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (was 30 min — broke long checkouts/multi-tab carts; refresh cookie still rotates server-side)
const PROFILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const GUEST_PROFILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// CRITICAL FIX: Token storage keys
const TOKEN_STORAGE_KEY = "benna-auth-token";
const TOKEN_TIMESTAMP_KEY = "benna-auth-token-ts";

export interface GuestProfile {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface AuthChangePayload {
  type: "login" | "logout" | "refresh" | "guest-update";
  userId?: string;
  email?: string;
  timestamp: number;
}

// SSR-safe module-level state
let memorySession: AuthSessionState | null = null;
let lastActivityTimestamp = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

// --- Storage Detection ---

const canUseStorage = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const test = "__storage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

const isPrivateMode = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem("__pm_test__", "1");
    window.localStorage.removeItem("__pm_test__");
    return false;
  } catch {
    return true;
  }
};

// --- Fingerprinting ---

const getSessionFingerprint = (): string => {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return "ssr";
  const raw = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
};

const verifyFingerprint = (): boolean => {
  const stored = getStorageItem("__benna_fp");
  const current = getSessionFingerprint();
  if (!stored) {
    setStorageItem("__benna_fp", current);
    return true;
  }
  return stored === current;
};

// --- Storage Helpers ---

const setStorageItem = (key: string, value: string): void => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / privacy mode
  }
};

const getStorageItem = (key: string): string | null => {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const removeStorageItem = (key: string): void => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

// --- Idle Timeout ---

const resetIdleTimer = (): void => {
  lastActivityTimestamp = Date.now();
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (Date.now() - lastActivityTimestamp >= IDLE_TIMEOUT_MS) {
      clearStoredAuthSession();
    }
  }, IDLE_TIMEOUT_MS);
};

const initIdleTracking = (): void => {
  if (typeof window === "undefined") return;
  const events = ["mousedown", "keydown", "touchstart", "scroll"];
  const handler = () => resetIdleTimer();
  events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  resetIdleTimer();
};

// --- Encryption Helpers (light obfuscation) ---

const obfuscate = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str).split("").reverse().join(""));
  } catch {
    return str;
  }
};

const deobfuscate = (str: string): string => {
  try {
    return decodeURIComponent(str.split("").reverse().join(""));
  } catch {
    return str;
  }
};

// --- Normalization ---

const normalizeUserDetail = (
  user: Partial<BackendSessionUser> | null | undefined,
): BackendSessionUser | null => {
  if (!user?._id || !user.email) return null;
  return {
    _id: String(user._id),
    email: String(user.email),
    fullName: user.fullName ? String(user.fullName).trim() : "",
    phoneNumber: user.phoneNumber ? String(user.phoneNumber).trim() : "",
    profilePic: user.profilePic ? String(user.profilePic).trim() : "",
  };
};

const normalizeSession = (
  session: Partial<AuthSessionState> | null | undefined,
): AuthSessionState | null => {
  if (!session?.token) return null;
  const userDetail = normalizeUserDetail(session.userDetail);
  if (!userDetail) return null;
  return { token: session.token, userDetail };
};

// --- Profile Storage ---

const readStoredProfile = (): BackendSessionUser | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = getStorageItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const tsRaw = getStorageItem(PROFILE_TIMESTAMP_KEY);
    const ts = tsRaw ? parseInt(tsRaw, 10) : NaN;
    if (Number.isFinite(ts) && Date.now() - ts > PROFILE_MAX_AGE_MS) {
      removeStorageItem(PROFILE_STORAGE_KEY);
      removeStorageItem(PROFILE_TIMESTAMP_KEY);
      return null;
    }

    return normalizeUserDetail(JSON.parse(raw));
  } catch {
    return null;
  }
};

const writeStoredProfile = (user: BackendSessionUser) => {
  if (!canUseStorage()) return;
  try {
    const serialized = JSON.stringify(user);
    if (serialized.length > 5000) {
      console.warn("[auth-session] Profile too large, skipping storage");
      return;
    }
    setStorageItem(PROFILE_STORAGE_KEY, serialized);
    setStorageItem(PROFILE_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // ignore quota / privacy mode errors
  }
};

const clearStoredProfile = () => {
  removeStorageItem(PROFILE_STORAGE_KEY);
  removeStorageItem(PROFILE_TIMESTAMP_KEY);
};

// --- Token Storage (CRITICAL FIX: localStorage + sessionStorage fallback) ---

const readStoredToken = (): string | null => {
  if (!canUseStorage()) return null;
  try {
    let raw = getStorageItem(TOKEN_STORAGE_KEY);
    let tsRaw = getStorageItem(TOKEN_TIMESTAMP_KEY);

    // Fallback to sessionStorage if localStorage is empty
    if (!raw && typeof window !== "undefined") {
      try {
        raw = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
        tsRaw = window.sessionStorage.getItem(TOKEN_TIMESTAMP_KEY);
      } catch {
        // ignore
      }
    }

    if (!raw) return null;

    const ts = tsRaw ? parseInt(tsRaw, 10) : NaN;
    if (Number.isFinite(ts) && Date.now() - ts > PROFILE_MAX_AGE_MS) {
      clearStoredToken();
      return null;
    }

    return raw;
  } catch {
    return null;
  }
};

const writeStoredToken = (token: string) => {
  if (!canUseStorage()) return;
  try {
    if (token.length > 10000) {
      console.warn("[auth-session] Token too large, skipping storage");
      return;
    }
    setStorageItem(TOKEN_STORAGE_KEY, token);
    setStorageItem(TOKEN_TIMESTAMP_KEY, String(Date.now()));
    // Backup to sessionStorage (survives page reloads within same tab)
    try {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      window.sessionStorage.setItem(TOKEN_TIMESTAMP_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  } catch {
    // ignore quota / privacy mode errors
  }
};

const clearStoredToken = () => {
  removeStorageItem(TOKEN_STORAGE_KEY);
  removeStorageItem(TOKEN_TIMESTAMP_KEY);
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(TOKEN_TIMESTAMP_KEY);
    }
  } catch {
    // ignore
  }
};

// --- Legacy Migration ---

const migrateLegacySession = () => {
  if (!canUseStorage()) return;
  try {
    const legacyRaw =
      getStorageItem(LEGACY_AUTH_SESSION_KEY) ||
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(LEGACY_AUTH_SESSION_KEY)
        : null);

    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        const userDetail = normalizeUserDetail(parsed?.userDetail);
        if (userDetail && !getStorageItem(PROFILE_STORAGE_KEY)) {
          writeStoredProfile(userDetail);
        }
        // Also migrate token if present
        if (parsed?.token && !getStorageItem(TOKEN_STORAGE_KEY)) {
          writeStoredToken(parsed.token);
        }
      } catch {
        // ignore malformed legacy blob
      }

      removeStorageItem(LEGACY_AUTH_SESSION_KEY);
      removeStorageItem(LEGACY_AUTH_SESSION_TIMESTAMP_KEY);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
      }
    }
  } catch {
    // ignore
  }
};

let didMigrate = false;
const ensureMigrated = () => {
  if (didMigrate) return;
  didMigrate = true;
  migrateLegacySession();
};

// --- Guest ID ---

export const getOrCreateGuestId = (): string => {
  if (!canUseStorage())
    return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    let guestId = getStorageItem(GUEST_ID_KEY);
    if (!guestId) {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        try {
          guestId = `guest_${crypto.randomUUID()}`;
        } catch {
          guestId = null;
        }
      }
      if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${Math.random().toString(36).slice(2, 8)}`;
      }
      setStorageItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  } catch {
    return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
};

export const clearGuestId = () => {
  if (!canUseStorage()) return;
  removeStorageItem(GUEST_ID_KEY);
  removeStorageItem(GUEST_PROFILE_KEY);
  removeStorageItem(GUEST_PROFILE_TS_KEY);
  emitAuthChange({ type: "logout", timestamp: Date.now() });
};

// --- Guest Profile ---

export const getGuestProfile = (): GuestProfile | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = getStorageItem(GUEST_PROFILE_KEY);
    if (!raw) return null;
    const ts = parseInt(getStorageItem(GUEST_PROFILE_TS_KEY) || "", 10);
    if (Number.isFinite(ts) && Date.now() - ts > GUEST_PROFILE_MAX_AGE_MS) {
      removeStorageItem(GUEST_PROFILE_KEY);
      removeStorageItem(GUEST_PROFILE_TS_KEY);
      return null;
    }
    const parsed = JSON.parse(deobfuscate(raw));
    return {
      email: parsed?.email ? String(parsed.email) : "",
      phone: parsed?.phone ? String(parsed.phone) : "",
      firstName: parsed?.firstName ? String(parsed.firstName) : "",
      lastName: parsed?.lastName ? String(parsed.lastName) : "",
    };
  } catch {
    return null;
  }
};

export const setGuestProfile = (profile: Partial<GuestProfile>) => {
  if (!canUseStorage()) return;
  try {
    const merged: GuestProfile = {
      email: "",
      phone: "",
      firstName: "",
      lastName: "",
      ...(getGuestProfile() || {}),
      ...profile,
    };
    const serialized = obfuscate(JSON.stringify(merged));
    if (serialized.length > 3000) {
      console.warn("[auth-session] Guest profile too large");
      return;
    }
    setStorageItem(GUEST_PROFILE_KEY, serialized);
    setStorageItem(GUEST_PROFILE_TS_KEY, String(Date.now()));
    emitAuthChange({ type: "guest-update", timestamp: Date.now() });
  } catch {
    /* ignore quota */
  }
};

// --- Auth Session ---

// 🔴 FIX: Skip destructive fingerprint check during post-checkout / payment
// returns — the iframe → top-window transition can change DPR/screen and
// nuke an otherwise-valid session. Just log + re-store and move on.
const isPostCheckoutPath = (): boolean => {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname || "";
  const q = window.location.search || "";
  const onPath = [
    "/payment-success",
    "/order-success",
    "/track-order",
    "/build-project/result",
  ].some((prefix) => p.startsWith(prefix));
  const hasPaymentParam =
    q.includes("paymentSuccess") ||
    q.includes("parentOrder") ||
    q.includes("tranRef") ||
    q.includes("session_id");
  return onPath || hasPaymentParam;
};

export const getStoredAuthSession = (): AuthSessionState | null => {
  ensureMigrated();
  if (memorySession) return memorySession;

  // Verify fingerprint on read — but don't destroy session mid-checkout
  if (!verifyFingerprint()) {
    if (isPostCheckoutPath()) {
      // Re-anchor fingerprint silently and continue
      setStorageItem("__benna_fp", getSessionFingerprint());
    } else {
      clearStoredAuthSession();
      return null;
    }
  }

  // CRITICAL FIX: Read token from localStorage/sessionStorage, not just memory
  const token = readStoredToken();
  const profile = readStoredProfile();

  if (!token || !profile) return null;

  // Reconstruct session from storage
  memorySession = { token, userDetail: profile };
  return memorySession;
};

export const setStoredAuthSession = (session: AuthSessionState) => {
  const normalized = normalizeSession(session);
  if (!normalized) return;
  ensureMigrated();

  const previous = memorySession;
  const changed =
    !previous ||
    previous.token !== normalized.token ||
    previous.userDetail._id !== normalized.userDetail._id ||
    previous.userDetail.email !== normalized.userDetail.email;

  memorySession = normalized;

  // CRITICAL FIX: Persist token to localStorage + sessionStorage
  writeStoredToken(normalized.token);
  writeStoredProfile(normalized.userDetail);
  setStorageItem("__benna_fp", getSessionFingerprint());

  if (changed) {
    emitAuthChange({
      type: "login",
      userId: normalized.userDetail._id,
      email: normalized.userDetail.email,
      timestamp: Date.now(),
    });
  }
  resetIdleTimer();
};

export const clearStoredAuthSession = () => {
  ensureMigrated();
  const hadSession =
    memorySession !== null ||
    readStoredProfile() !== null ||
    readStoredToken() !== null;
  const previousUser = memorySession?.userDetail;

  memorySession = null;
  clearStoredProfile();
  clearStoredToken(); // CRITICAL FIX: Also clear token from storage
  clearGuestId();

  removeStorageItem("__benna_fp");
  removeStorageItem("benna-auth-had-session");

  if (hadSession) {
    emitAuthChange({
      type: "logout",
      userId: previousUser?._id,
      email: previousUser?.email,
      timestamp: Date.now(),
    });
  }
};

// CRITICAL FIX: getAccessToken now reads from localStorage/sessionStorage, not just memory
export const getAccessToken = (): string | null => {
  // First check memory (fast path)
  if (memorySession?.token) return memorySession.token;

  // Fall back to localStorage/sessionStorage (survives page reloads)
  return readStoredToken();
};

export const getCurrentUserDetail = () =>
  getStoredAuthSession()?.userDetail ?? null;

export const getCurrentUserId = () => getCurrentUserDetail()?._id ?? null;

// --- Event System ---

const emitAuthChange = (payload: AuthChangePayload) => {
  if (!canUseStorage()) return;
  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_SESSION_EVENT, { detail: payload }),
    );
  } catch {
    // ignore
  }
};

export const subscribeToAuthSession = (
  callback: (payload?: AuthChangePayload) => void,
) => {
  if (!canUseStorage()) return () => undefined;
  const handler = (e: Event) => {
    const payload = (e as CustomEvent<AuthChangePayload>)?.detail;
    callback(payload);
  };
  window.addEventListener(AUTH_SESSION_EVENT, handler);
  return () => window.removeEventListener(AUTH_SESSION_EVENT, handler);
};

export const getStoredProfile = readStoredProfile;

// ============================================
// CRITICAL FIX: Auto-rehydrate session from storage on module load
// This ensures memorySession is populated immediately when the app starts
// ============================================
if (typeof window !== "undefined") {
  ensureMigrated();
  const rehydratedToken = readStoredToken();
  const rehydratedProfile = readStoredProfile();
  if (rehydratedToken && rehydratedProfile) {
    memorySession = { token: rehydratedToken, userDetail: rehydratedProfile };
    console.log("[auth-session] Auto-rehydrated from storage", {
      userId: rehydratedProfile._id,
      tokenPrefix: rehydratedToken.slice(0, 20) + "...",
    });
  }
}

// Initialize idle tracking on client
if (typeof window !== "undefined") {
  initIdleTracking();
}
