import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import BanDialog from "../components/BanDialog";
import {
  loadCredentials,
  saveCredentials,
  useApp,
} from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { banDaysRemaining, hashPassword } from "../utils/crypto";

export default function LoginPage() {
  const { setView, setCurrentUser, sessionToken } = useApp();
  const { actor } = useActor();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [bannedUser, setBannedUser] = useState<{
    daysRemaining: number;
  } | null>(null);

  // Auto-login on mount if saved credentials exist
  useEffect(() => {
    if (!actor || autoLoginAttempted) return;
    const creds = loadCredentials();
    if (!creds) {
      setAutoLoginAttempted(true);
      return;
    }
    setAutoLoginAttempted(true);
    setLoading(true);
    actor
      .loginWithToken(creds.username, creds.passwordHash, sessionToken)
      .then((profile) => {
        if (profile.isBanned) {
          const days = banDaysRemaining(profile.banExpiryTimestamp);
          if (days > 0) {
            setBannedUser({ daysRemaining: days });
            return;
          }
        }
        setCurrentUser(profile);
        setView("app");
      })
      .catch(() => {
        // Saved credentials are stale or canister was redeployed — clear silently
        localStorage.removeItem("myapp_saved_credentials");
        localStorage.removeItem("myapp_session_token");
      })
      .finally(() => setLoading(false));
  }, [actor, autoLoginAttempted, sessionToken, setCurrentUser, setView]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      const hash = await hashPassword(password);
      const profile = await actor.loginWithToken(
        username.trim(),
        hash,
        sessionToken,
      );

      if (profile.isBanned) {
        const days = banDaysRemaining(profile.banExpiryTimestamp);
        if (days > 0) {
          setBannedUser({ daysRemaining: days });
          setLoading(false);
          return;
        }
      }

      // Save credentials for auto-login on future page loads
      saveCredentials(username.trim(), hash);

      setCurrentUser(profile);
      setView("app");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      // IC trap messages are wrapped in verbose reject text — extract the core message
      const match = raw.match(/Reject text: (.+?)(?:\s*\(.*\))?$/m);
      const msg = match ? match[1].trim() : raw;
      if (
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("invalid") ||
        msg.toLowerCase().includes("incorrect")
      ) {
        toast.error("Incorrect username or password");
      } else if (msg.toLowerCase().includes("banned")) {
        toast.error("Your account is currently banned");
      } else if (
        msg.toLowerCase().includes("not connected") ||
        msg.toLowerCase().includes("actor")
      ) {
        toast.error("Not connected — please refresh and try again");
      } else {
        toast.error(msg || "Login failed — please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    setView("guest");
  };

  // Show a spinner while auto-login is in progress (before attempt resolves)
  const savedCreds = !autoLoginAttempted && loadCredentials();
  if (savedCreds || (loading && !autoLoginAttempted)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {bannedUser && (
        <BanDialog
          daysRemaining={bannedUser.daysRemaining}
          onClose={() => setBannedUser(null)}
        />
      )}

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Background texture */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, oklch(0.9 0 0) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
              Myapp
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to continue messaging
            </p>
          </div>

          {/* Form card */}
          <div className="glass-panel rounded-2xl p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="username"
                  className="text-sm text-foreground/80"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  data-ocid="auth.username_input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={loading}
                  className="bg-input/50 border-border focus:border-primary/60 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-sm text-foreground/80"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  data-ocid="auth.password_input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="bg-input/50 border-border focus:border-primary/60 h-10"
                />
              </div>

              <Button
                type="submit"
                data-ocid="auth.login_button"
                disabled={loading}
                className="w-full h-10 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-popover px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <Button
                variant="outline"
                className="w-full h-10 border-border hover:bg-secondary/60 transition-colors"
                onClick={() => setView("register")}
              >
                Create an account
              </Button>

              <Button
                variant="ghost"
                data-ocid="auth.guest_button"
                className="w-full h-10 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                onClick={handleGuestMode}
              >
                Continue as Guest
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </motion.div>
      </div>
    </>
  );
}
