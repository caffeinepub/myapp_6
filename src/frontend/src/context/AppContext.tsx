import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { UserProfile } from "../backend.d";
import { generateSessionToken } from "../utils/crypto";

export type AppView = "login" | "register" | "app" | "guest";

const SESSION_TOKEN_KEY = "myapp_session_token";
const SAVED_CREDENTIALS_KEY = "myapp_saved_credentials";

// Stored credentials for auto-login on page reload
interface SavedCredentials {
  username: string;
  passwordHash: string;
}

function getOrCreateSessionToken(): string {
  // Use localStorage so it persists across browser restarts
  const existing = localStorage.getItem(SESSION_TOKEN_KEY);
  if (existing) return existing;
  const token = generateSessionToken();
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  return token;
}

export function saveCredentials(username: string, passwordHash: string) {
  localStorage.setItem(
    SAVED_CREDENTIALS_KEY,
    JSON.stringify({ username, passwordHash }),
  );
}

export function loadCredentials(): SavedCredentials | null {
  try {
    const raw = localStorage.getItem(SAVED_CREDENTIALS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedCredentials;
  } catch {
    return null;
  }
}

function clearCredentials() {
  localStorage.removeItem(SAVED_CREDENTIALS_KEY);
}

interface AppContextValue {
  view: AppView;
  setView: (v: AppView) => void;
  currentUser: UserProfile | null;
  setCurrentUser: (u: UserProfile | null) => void;
  isGuest: boolean;
  setIsGuest: (v: boolean) => void;
  guestContactSerial: string;
  setGuestContactSerial: (s: string) => void;
  logout: (
    actor?: { logoutToken: (token: string) => Promise<void> } | null,
  ) => void;
  myBucksBalance: bigint;
  setMyBucksBalance: (b: bigint) => void;
  sessionToken: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("login");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestContactSerial, setGuestContactSerial] = useState("");
  const [myBucksBalance, setMyBucksBalance] = useState<bigint>(0n);
  // Session token: persisted in localStorage so it survives page reloads
  const [sessionToken] = useState<string>(() => getOrCreateSessionToken());

  const logout = useCallback(
    (actor?: { logoutToken: (token: string) => Promise<void> } | null) => {
      // Fire-and-forget: tell the backend this token is gone
      if (actor && sessionToken) {
        actor.logoutToken(sessionToken).catch(() => {
          // ignore errors — best effort
        });
      }
      setCurrentUser(null);
      setIsGuest(false);
      setGuestContactSerial("");
      setMyBucksBalance(0n);
      setView("login");
      // Clear saved credentials and session token so user is truly logged out
      clearCredentials();
      localStorage.removeItem(SESSION_TOKEN_KEY);
    },
    [sessionToken],
  );

  // Clear guest session on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (isGuest) {
        localStorage.removeItem(SAVED_CREDENTIALS_KEY);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [isGuest]);

  // Sync balance when user changes
  useEffect(() => {
    if (currentUser) {
      setMyBucksBalance(currentUser.myBucksBalance);
    }
  }, [currentUser]);

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        currentUser,
        setCurrentUser,
        isGuest,
        setIsGuest,
        guestContactSerial,
        setGuestContactSerial,
        logout,
        myBucksBalance,
        setMyBucksBalance,
        sessionToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
