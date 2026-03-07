import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { formatSerial, hashPassword } from "../utils/crypto";

export default function RegisterPage() {
  const { setView, setCurrentUser, sessionToken } = useApp();
  const { actor } = useActor();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const hash = await hashPassword(password);
      const serialNumber = await actor.registerWithToken(
        username.trim(),
        hash,
        displayName.trim(),
        sessionToken,
      );

      toast.success(
        `Account created! Your serial is ${formatSerial(serialNumber)}`,
        { duration: 5000 },
      );

      // Auto-login after registration
      const profile = await actor.loginWithToken(
        username.trim(),
        hash,
        sessionToken,
      );
      setCurrentUser(profile);
      setView("app");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("exist") ||
        msg.toLowerCase().includes("taken")
      ) {
        toast.error("Username already taken");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
            Create Account
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Join Myapp and get your serial number
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="displayName"
                className="text-sm text-foreground/80"
              >
                Display Name
              </Label>
              <Input
                id="displayName"
                data-ocid="auth.displayname_input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How others will see you"
                autoComplete="name"
                disabled={loading}
                className="bg-input/50 border-border focus:border-primary/60 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm text-foreground/80">
                Username
              </Label>
              <Input
                id="username"
                data-ocid="auth.username_input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a unique username"
                autoComplete="username"
                disabled={loading}
                className="bg-input/50 border-border focus:border-primary/60 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-foreground/80">
                Password
              </Label>
              <Input
                id="password"
                data-ocid="auth.password_input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                disabled={loading}
                className="bg-input/50 border-border focus:border-primary/60 h-10"
              />
            </div>

            <Button
              type="submit"
              data-ocid="auth.register_button"
              disabled={loading}
              className="w-full h-10 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {loading ? "Creating…" : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-sm"
              onClick={() => setView("login")}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to sign in
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
