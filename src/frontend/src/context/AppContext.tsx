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

function getOrCreateSessionToken(): string {
  const existing = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (existing) return existing;
  const token = generateSessionToken();
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  return token;
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
  // Session token: per-tab, never syncs between devices
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
      // Clear session storage (guest data, etc.) but keep the token so
      // the same tab can log in again without re-generating a token.
      // Only wipe non-token session keys.
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key !== SESSION_TOKEN_KEY) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        sessionStorage.removeItem(key);
      }
    },
    [sessionToken],
  );

  // Clear guest session on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (isGuest) {
        sessionStorage.clear();
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
