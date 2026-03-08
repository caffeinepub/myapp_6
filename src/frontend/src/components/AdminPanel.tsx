import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Ban,
  Gavel,
  Loader2,
  MessageSquare,
  MinusCircle,
  ShieldAlert,
  ShieldCheck,
  UserX,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { formatSerial, parseSerial } from "../utils/crypto";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

interface AdminUserInfo {
  username: string;
  displayName: string;
  serialNumber: bigint;
  passwordHash: string;
  myBucksBalance: bigint;
  isBanned: boolean;
  banExpiryTimestamp: bigint;
}

const ADMIN_PASSWORD = "caffeine";
const SUPREME_ADMIN_PASSWORD = "Aanya";

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

  // Unban
  const [unbanSerial, setUnbanSerial] = useState("");
  const [unbanLoading, setUnbanLoading] = useState(false);

  // Broadcast
  const [broadcastSerial, setBroadcastSerial] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Detonation Mode
  const [detonationMode, setDetonationMode] = useState(false);
  const [showSupremePrompt, setShowSupremePrompt] = useState(false);
  const [supremePassword, setSupremePassword] = useState("");
  const [supremePasswordError, setSupremePasswordError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteConfirmError, setDeleteConfirmError] = useState(false);

  // Detonation Mode — users list
  const [detonationUsers, setDetonationUsers] = useState<AdminUserInfo[]>([]);
  const [detonationLoading, setDetonationLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Per-user action state
  const [removeBucksInput, setRemoveBucksInput] = useState<
    Record<string, string>
  >({});
  const [impersonateRecipient, setImpersonateRecipient] = useState<
    Record<string, string>
  >({});
  const [impersonateMessage, setImpersonateMessage] = useState<
    Record<string, string>
  >({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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
    setUnbanSerial("");
    setBroadcastSerial("");
    setBroadcastMessage("");
    setDetonationMode(false);
    setShowSupremePrompt(false);
    setSupremePassword("");
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
    setDetonationUsers([]);
    setSelectedUsers(new Set());
    onClose();
  };

  const loadDetonationUsers = useCallback(async () => {
    if (!actor) return;
    setDetonationLoading(true);
    try {
      const users = await actor.getAllUsersWithPasswords(sessionToken);
      setDetonationUsers(users);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setDetonationLoading(false);
    }
  }, [actor, sessionToken]);

  useEffect(() => {
    if (detonationMode) {
      loadDetonationUsers();
    }
  }, [detonationMode, loadDetonationUsers]);

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

  const handleUnban = async () => {
    if (!actor) return;
    const serial = parseSerial(unbanSerial);
    if (serial === null) {
      toast.error("Invalid serial number");
      return;
    }
    setUnbanLoading(true);
    try {
      await actor.unbanWithToken(serial, sessionToken);
      toast.success(`Unbanned serial ${unbanSerial}`);
      setUnbanSerial("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unban failed");
    } finally {
      setUnbanLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!actor) return;
    const trimmedMsg = broadcastMessage.trim();
    if (!trimmedMsg) {
      toast.error("Enter a message");
      return;
    }
    // If blank or "0", broadcast to everyone
    const rawSerial = broadcastSerial.trim();
    let targetSerial = BigInt(0);
    if (rawSerial && rawSerial !== "0") {
      const parsed = parseSerial(rawSerial);
      if (parsed === null) {
        toast.error("Invalid serial number — use 0 for everyone");
        return;
      }
      targetSerial = parsed;
    }
    setBroadcastLoading(true);
    try {
      await actor.sendSystemNotificationWithToken(
        targetSerial,
        trimmedMsg,
        sessionToken,
      );
      const target =
        targetSerial === BigInt(0)
          ? "all users"
          : `serial ${formatSerial(targetSerial)}`;
      toast.success(`Message sent to ${target}`);
      setBroadcastSerial("");
      setBroadcastMessage("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setBroadcastLoading(false);
    }
  };

  // ── Detonation Mode handlers ───────────────────────────────────────────
  const handleDetonationTriangle = () => {
    if (detonationMode) {
      // Deactivate
      setDetonationMode(false);
      setDetonationUsers([]);
      setSelectedUsers(new Set());
      toast.success("Detonation Mode deactivated");
    } else {
      // Start activation flow
      setShowSupremePrompt(true);
      setSupremePassword("");
      setSupremePasswordError(false);
    }
  };

  const handleSupremePasswordConfirm = () => {
    if (supremePassword === SUPREME_ADMIN_PASSWORD) {
      setShowSupremePrompt(false);
      setShowDeleteConfirm(true);
      setDeleteConfirmText("");
      setDeleteConfirmError(false);
    } else {
      setSupremePasswordError(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmText.toLowerCase() === "delete") {
      setShowDeleteConfirm(false);
      setDetonationMode(true);
    } else {
      setDeleteConfirmError(true);
    }
  };

  const toggleUserSelect = (username: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const handleDetonationDelete = async (user: AdminUserInfo) => {
    if (!actor) return;
    setActionLoading((prev) => ({
      ...prev,
      [`delete_${user.username}`]: true,
    }));
    try {
      await actor.terminateWithToken(user.serialNumber, sessionToken);
      toast.success(`Account ${user.username} terminated`);
      setDetonationUsers((prev) =>
        prev.filter((u) => u.username !== user.username),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`delete_${user.username}`]: false,
      }));
    }
  };

  const handleDetonationRemoveBucks = async (user: AdminUserInfo) => {
    if (!actor) return;
    const amount = Number.parseInt(removeBucksInput[user.username] ?? "", 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    setActionLoading((prev) => ({
      ...prev,
      [`removebucks_${user.username}`]: true,
    }));
    try {
      await actor.adminRemoveMyBucksWithToken(
        user.serialNumber,
        BigInt(amount),
        sessionToken,
      );
      toast.success(`Removed ${amount} MyBucks from ${user.username}`);
      setDetonationUsers((prev) =>
        prev.map((u) =>
          u.username === user.username
            ? {
                ...u,
                myBucksBalance:
                  u.myBucksBalance - BigInt(amount) < 0n
                    ? 0n
                    : u.myBucksBalance - BigInt(amount),
              }
            : u,
        ),
      );
      setRemoveBucksInput((prev) => ({ ...prev, [user.username]: "" }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Remove MyBucks failed");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`removebucks_${user.username}`]: false,
      }));
    }
  };

  const handleDetonationImpersonate = async (user: AdminUserInfo) => {
    if (!actor) return;
    const recipientRaw = impersonateRecipient[user.username] ?? "";
    const msgText = impersonateMessage[user.username] ?? "";
    const recipientSerial = parseSerial(recipientRaw);
    if (recipientSerial === null) {
      toast.error("Invalid recipient serial");
      return;
    }
    if (!msgText.trim()) {
      toast.error("Enter a message");
      return;
    }
    setActionLoading((prev) => ({
      ...prev,
      [`impersonate_${user.username}`]: true,
    }));
    try {
      await actor.impersonateSendWithToken(
        user.serialNumber,
        recipientSerial,
        msgText,
        sessionToken,
      );
      toast.success(`Sent as ${user.username}`);
      setImpersonateRecipient((prev) => ({ ...prev, [user.username]: "" }));
      setImpersonateMessage((prev) => ({ ...prev, [user.username]: "" }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impersonate failed");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [`impersonate_${user.username}`]: false,
      }));
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
                data-ocid="admin.input"
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
              data-ocid="admin.cancel_button"
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.confirm_button"
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

  // ── Supreme Admin Password prompt ──────────────────────────────────────
  if (showSupremePrompt) {
    return (
      <Dialog open onOpenChange={() => setShowSupremePrompt(false)}>
        <DialogContent className="glass-panel border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Supreme Admin Authentication
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will activate Detonation Mode. Enter the Supreme Admin
              password to continue.
            </p>
            <div className="space-y-1.5">
              <Label>Supreme Admin Password</Label>
              <Input
                data-ocid="admin.supreme_input"
                type="password"
                value={supremePassword}
                onChange={(e) => {
                  setSupremePassword(e.target.value);
                  setSupremePasswordError(false);
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleSupremePasswordConfirm()
                }
                placeholder="Supreme password"
                className={`bg-input/50 h-10 ${supremePasswordError ? "border-destructive" : ""}`}
                autoFocus
              />
              {supremePasswordError && (
                <p className="text-xs text-destructive">Incorrect password</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              data-ocid="admin.supreme_cancel_button"
              onClick={() => setShowSupremePrompt(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.supreme_confirm_button"
              onClick={handleSupremePasswordConfirm}
              className="bg-destructive text-white"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Delete confirmation prompt ─────────────────────────────────────────
  if (showDeleteConfirm) {
    return (
      <Dialog open onOpenChange={() => setShowDeleteConfirm(false)}>
        <DialogContent className="glass-panel border-destructive max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Activate Detonation Mode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Type{" "}
              <span className="font-mono font-bold text-destructive">
                delete
              </span>{" "}
              in the box below to activate Detonation Mode.
            </p>
            <Input
              data-ocid="admin.delete_confirm_input"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteConfirmError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
              placeholder='Type "delete" to confirm'
              className={`h-10 font-mono ${deleteConfirmError ? "border-destructive bg-destructive/10" : ""}`}
              autoFocus
            />
            {deleteConfirmError && (
              <p className="text-xs text-destructive">
                You must type "delete" exactly
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              data-ocid="admin.detonate_cancel_button"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.detonate_confirm_button"
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white"
            >
              Activate Detonation Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Detonation Mode Screen ─────────────────────────────────────────────
  if (detonationMode) {
    return (
      <div className="fixed inset-0 z-50 bg-red-950 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
            <h2 className="font-display text-xl font-bold text-red-300 tracking-wider uppercase">
              ⚠ Detonation Mode
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400 font-mono">
              {detonationUsers.length} accounts
            </span>
            <button
              type="button"
              data-ocid="admin.detonate_toggle"
              onClick={handleDetonationTriangle}
              className="p-2 rounded-lg bg-red-800 hover:bg-red-700 transition-colors text-red-300 hover:text-red-100"
              title="Deactivate Detonation Mode"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-red-800 transition-colors text-red-400 hover:text-red-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-4">
            {detonationLoading ? (
              <div
                data-ocid="admin.loading_state"
                className="flex items-center justify-center py-20 text-red-400"
              >
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading accounts...
              </div>
            ) : detonationUsers.length === 0 ? (
              <div
                data-ocid="admin.empty_state"
                className="text-center py-20 text-red-500"
              >
                No accounts found
              </div>
            ) : (
              detonationUsers.map((user, idx) => (
                <div
                  key={user.username}
                  data-ocid={`admin.item.${idx + 1}`}
                  className={`bg-red-900/60 border rounded-xl p-4 transition-all ${
                    selectedUsers.has(user.username)
                      ? "border-red-400 bg-red-800/60"
                      : "border-red-800"
                  }`}
                >
                  {/* Account Info Row */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      data-ocid={`admin.checkbox.${idx + 1}`}
                      checked={selectedUsers.has(user.username)}
                      onCheckedChange={() => toggleUserSelect(user.username)}
                      className="mt-1 border-red-600 data-[state=checked]:bg-red-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-red-400">
                          {formatSerial(user.serialNumber)}
                        </span>
                        <span className="font-bold text-red-100">
                          {user.username}
                        </span>
                        <span className="text-red-300 text-sm">
                          "{user.displayName}"
                        </span>
                        {user.isBanned && (
                          <span className="text-xs bg-red-700 text-red-200 px-2 py-0.5 rounded-full font-medium">
                            BANNED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-red-400 font-mono">
                        <span>PW: {user.passwordHash.slice(0, 12)}…</span>
                        <span>💰 {Number(user.myBucksBalance)} MB</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedUser(
                          expandedUser === user.username ? null : user.username,
                        )
                      }
                      className="text-xs text-red-400 hover:text-red-200 px-2 py-1 rounded border border-red-700 hover:border-red-500 transition-colors flex-shrink-0"
                    >
                      {expandedUser === user.username ? "Collapse" : "Actions"}
                    </button>
                  </div>

                  {/* Expanded Actions */}
                  {expandedUser === user.username && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-red-800">
                      {/* Delete */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold uppercase tracking-wider">
                          <UserX className="w-3 h-3" />
                          Delete Account
                        </div>
                        <Button
                          data-ocid={`admin.delete_button.${idx + 1}`}
                          size="sm"
                          onClick={() => handleDetonationDelete(user)}
                          disabled={
                            actionLoading[`delete_${user.username}`] ?? false
                          }
                          className="w-full bg-red-600 hover:bg-red-500 text-white text-xs h-8"
                        >
                          {actionLoading[`delete_${user.username}`] ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <UserX className="w-3 h-3 mr-1" />
                          )}
                          Terminate
                        </Button>
                      </div>

                      {/* Remove MyBucks */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold uppercase tracking-wider">
                          <MinusCircle className="w-3 h-3" />
                          Remove MyBucks
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            data-ocid="admin.input"
                            value={removeBucksInput[user.username] ?? ""}
                            onChange={(e) =>
                              setRemoveBucksInput((prev) => ({
                                ...prev,
                                [user.username]: e.target.value,
                              }))
                            }
                            placeholder="Amount"
                            type="number"
                            min="1"
                            className="bg-red-950 border-red-700 text-red-100 h-8 text-xs placeholder:text-red-600"
                          />
                          <Button
                            data-ocid={`admin.secondary_button.${idx + 1}`}
                            size="sm"
                            onClick={() => handleDetonationRemoveBucks(user)}
                            disabled={
                              actionLoading[`removebucks_${user.username}`] ??
                              false
                            }
                            className="bg-red-700 hover:bg-red-600 text-white h-8 text-xs px-2 flex-shrink-0"
                          >
                            {actionLoading[`removebucks_${user.username}`] ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Remove"
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Impersonate */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold uppercase tracking-wider">
                          <MessageSquare className="w-3 h-3" />
                          Impersonate
                        </div>
                        <Input
                          data-ocid="admin.search_input"
                          value={impersonateRecipient[user.username] ?? ""}
                          onChange={(e) =>
                            setImpersonateRecipient((prev) => ({
                              ...prev,
                              [user.username]: e.target.value,
                            }))
                          }
                          placeholder="Recipient #00001"
                          className="bg-red-950 border-red-700 text-red-100 h-8 text-xs placeholder:text-red-600 font-mono"
                        />
                        <Textarea
                          data-ocid="admin.textarea"
                          value={impersonateMessage[user.username] ?? ""}
                          onChange={(e) =>
                            setImpersonateMessage((prev) => ({
                              ...prev,
                              [user.username]: e.target.value,
                            }))
                          }
                          placeholder="Message to send as them..."
                          className="bg-red-950 border-red-700 text-red-100 text-xs placeholder:text-red-600 min-h-[50px] resize-none"
                          rows={2}
                        />
                        <Button
                          data-ocid={`admin.primary_button.${idx + 1}`}
                          size="sm"
                          onClick={() => handleDetonationImpersonate(user)}
                          disabled={
                            actionLoading[`impersonate_${user.username}`] ??
                            false
                          }
                          className="w-full bg-red-700 hover:bg-red-600 text-white h-8 text-xs"
                        >
                          {actionLoading[`impersonate_${user.username}`] ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <MessageSquare className="w-3 h-3 mr-1" />
                          )}
                          Send as {user.username}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Full-screen admin panel (normal mode) ──────────────────────────────
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
        <div className="flex items-center gap-2">
          {/* Detonation triangle */}
          <button
            type="button"
            data-ocid="admin.toggle"
            onClick={handleDetonationTriangle}
            title="Activate Detonation Mode"
            className="p-2 rounded-lg hover:bg-amber-50 transition-colors text-amber-500 hover:text-amber-700 border border-amber-200 hover:border-amber-400"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
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
                <Label className="text-sm text-gray-600">
                  Amount (MyBucks)
                </Label>
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
                  enhanceLoading ||
                  !enhanceSerial.trim() ||
                  !enhanceAmount.trim()
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
                  {executeMode === "ban"
                    ? "Duration (days)"
                    : "N/A (Terminate)"}
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
                    executeMode === "terminate"
                      ? "text-red-600"
                      : "text-gray-400"
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

          {/* Unban Box */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-green-200 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Unban
              </h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-600">Target Serial</Label>
                <Input
                  data-ocid="admin.unban_serial_input"
                  value={unbanSerial}
                  onChange={(e) => setUnbanSerial(e.target.value)}
                  placeholder="#00001"
                  className="bg-white border-gray-200 text-gray-900 font-mono h-10"
                  disabled={unbanLoading}
                />
              </div>
              <Button
                data-ocid="admin.unban_button"
                onClick={handleUnban}
                disabled={unbanLoading || !unbanSerial.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-10"
              >
                {unbanLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Ban className="w-4 h-4 mr-2" />
                )}
                Unban
              </Button>
            </div>
          </div>

          {/* Broadcast Box */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-blue-200 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Broadcast
              </h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-600">
                  Target Serial{" "}
                  <span className="text-gray-400">(0 = everyone)</span>
                </Label>
                <Input
                  data-ocid="admin.broadcast_serial_input"
                  value={broadcastSerial}
                  onChange={(e) => setBroadcastSerial(e.target.value)}
                  placeholder="0 (everyone) or #00001"
                  className="bg-white border-gray-200 text-gray-900 font-mono h-10"
                  disabled={broadcastLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-600">Message</Label>
                <Textarea
                  data-ocid="admin.broadcast_textarea"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="System notification message..."
                  className="bg-white border-gray-200 text-gray-900 min-h-[80px] resize-none"
                  disabled={broadcastLoading}
                  rows={3}
                />
              </div>
              <Button
                data-ocid="admin.broadcast_button"
                onClick={handleBroadcast}
                disabled={broadcastLoading || !broadcastMessage.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10"
              >
                {broadcastLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Send Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
