import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Gavel, Loader2, ShieldAlert, X, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { parseSerial } from "../utils/crypto";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

const ADMIN_PASSWORD = "caffeine";

export default function AdminPanel({ open, onClose }: AdminPanelProps) {
  const { actor } = useActor();
  const { sessionToken } = useApp();
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  // Enhance
  const [enhanceSerial, setEnhanceSerial] = useState("");
  const [enhanceAmount, setEnhanceAmount] = useState("");
  const [enhanceLoading, setEnhanceLoading] = useState(false);

  // Execute
  const [executeSerial, setExecuteSerial] = useState("");
  const [executeValue, setExecuteValue] = useState("");
  const [executeMode, setExecuteMode] = useState<"terminate" | "ban">("ban");
  const [executeLoading, setExecuteLoading] = useState(false);

  const handleAuthConfirm = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleClose = () => {
    setAuthenticated(false);
    setAdminPassword("");
    setAuthError(false);
    setEnhanceSerial("");
    setEnhanceAmount("");
    setExecuteSerial("");
    setExecuteValue("");
    onClose();
  };

  const handleEnhance = async () => {
    if (!actor) return;
    const serial = parseSerial(enhanceSerial);
    if (serial === null) {
      toast.error("Invalid serial number");
      return;
    }
    const amount = Number.parseInt(enhanceAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setEnhanceLoading(true);
    try {
      await actor.enhanceWithToken(serial, BigInt(amount), sessionToken);
      toast.success(`Added ${amount} MyBucks to serial ${enhanceSerial}`);
      setEnhanceSerial("");
      setEnhanceAmount("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Enhance failed");
    } finally {
      setEnhanceLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!actor) return;
    const serial = parseSerial(executeSerial);
    if (serial === null) {
      toast.error("Invalid serial number");
      return;
    }
    setExecuteLoading(true);
    try {
      if (executeMode === "terminate") {
        await actor.terminateWithToken(serial, sessionToken);
        toast.success(`Account terminated for serial ${executeSerial}`);
      } else {
        const days = Number.parseInt(executeValue, 10);
        if (Number.isNaN(days) || days <= 0) {
          toast.error("Enter valid number of days");
          setExecuteLoading(false);
          return;
        }
        await actor.banWithToken(serial, BigInt(days), sessionToken);
        toast.success(`Banned serial ${executeSerial} for ${days} days`);
      }
      setExecuteSerial("");
      setExecuteValue("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Execute failed");
    } finally {
      setExecuteLoading(false);
    }
  };

  if (!open) return null;

  // Password prompt
  if (!authenticated) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="glass-panel border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Admin Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the admin password to continue.
            </p>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                data-ocid="admin.password_input"
                type="password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAuthError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAuthConfirm()}
                placeholder="Admin password"
                className={`bg-input/50 h-10 ${authError ? "border-destructive" : ""}`}
                autoFocus
              />
              {authError && (
                <p className="text-xs text-destructive">Incorrect password</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.password_confirm_button"
              onClick={handleAuthConfirm}
              className="bg-primary text-primary-foreground"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Full-screen admin panel
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-gray-700" />
          <h2 className="font-display text-xl font-bold text-gray-900">
            Admin Panel
          </h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Enhance Box */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-fit">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900">
              Enhance
            </h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Target Serial</Label>
              <Input
                data-ocid="admin.enhance_serial_input"
                value={enhanceSerial}
                onChange={(e) => setEnhanceSerial(e.target.value)}
                placeholder="#00001"
                className="bg-white border-gray-200 text-gray-900 font-mono h-10"
                disabled={enhanceLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Amount (MyBucks)</Label>
              <Input
                data-ocid="admin.enhance_amount_input"
                value={enhanceAmount}
                onChange={(e) => setEnhanceAmount(e.target.value)}
                placeholder="500"
                type="number"
                min="1"
                className="bg-white border-gray-200 text-gray-900 h-10"
                disabled={enhanceLoading}
              />
            </div>
            <Button
              data-ocid="admin.enhance_button"
              onClick={handleEnhance}
              disabled={
                enhanceLoading || !enhanceSerial.trim() || !enhanceAmount.trim()
              }
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold h-10"
            >
              {enhanceLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Enhance
            </Button>
          </div>
        </div>

        {/* Execution Box */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-fit">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900">
              Execute
            </h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Target Serial</Label>
              <Input
                data-ocid="admin.execute_serial_input"
                value={executeSerial}
                onChange={(e) => setExecuteSerial(e.target.value)}
                placeholder="#00001"
                className="bg-white border-gray-200 text-gray-900 font-mono h-10"
                disabled={executeLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">
                {executeMode === "ban" ? "Duration (days)" : "N/A (Terminate)"}
              </Label>
              <Input
                data-ocid="admin.execute_value_input"
                value={executeValue}
                onChange={(e) => setExecuteValue(e.target.value)}
                placeholder={executeMode === "ban" ? "7" : "—"}
                type="number"
                min="1"
                className="bg-white border-gray-200 text-gray-900 h-10"
                disabled={executeLoading || executeMode === "terminate"}
              />
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
              <span
                className={`text-sm font-medium ${
                  executeMode === "ban" ? "text-red-600" : "text-gray-400"
                }`}
              >
                Ban
              </span>
              <Switch
                data-ocid="admin.execute_toggle"
                checked={executeMode === "terminate"}
                onCheckedChange={(checked) =>
                  setExecuteMode(checked ? "terminate" : "ban")
                }
                className="data-[state=checked]:bg-red-600"
              />
              <span
                className={`text-sm font-medium ${
                  executeMode === "terminate" ? "text-red-600" : "text-gray-400"
                }`}
              >
                Terminate
              </span>
            </div>

            <Button
              data-ocid="admin.execute_button"
              onClick={handleExecute}
              disabled={
                executeLoading ||
                !executeSerial.trim() ||
                (executeMode === "ban" && !executeValue.trim())
              }
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold h-10"
            >
              {executeLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gavel className="w-4 h-4 mr-2" />
              )}
              {executeMode === "terminate" ? "Terminate" : "Ban"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
