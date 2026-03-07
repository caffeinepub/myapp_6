import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { hashPassword } from "../utils/crypto";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { actor } = useActor();
  const { currentUser, setCurrentUser, myBucksBalance, sessionToken } =
    useApp();

  // Display name
  const [newDisplayName, setNewDisplayName] = useState("");
  const [displayNameLoading, setDisplayNameLoading] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Username
  const [newUsername, setNewUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Track last display name change (localStorage for persistence)
  const getLastDisplayNameChange = (): number | null => {
    const stored = localStorage.getItem(
      `lastDisplayNameChange_${currentUser?.username}`,
    );
    return stored ? Number.parseInt(stored, 10) : null;
  };

  const handleDisplayNameSave = async () => {
    if (!actor || !newDisplayName.trim()) return;

    const lastChange = getLastDisplayNameChange();
    if (lastChange) {
      const hoursSince = (Date.now() - lastChange) / 3_600_000;
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        toast.error(
          `Display name can only be changed once every 24 hours. Try again in ${hoursLeft}h.`,
        );
        return;
      }
    }

    setDisplayNameLoading(true);
    try {
      await actor.updateDisplayNameWithToken(
        newDisplayName.trim(),
        sessionToken,
      );
      localStorage.setItem(
        `lastDisplayNameChange_${currentUser?.username}`,
        Date.now().toString(),
      );
      if (currentUser) {
        setCurrentUser({ ...currentUser, displayName: newDisplayName.trim() });
      }
      toast.success("Display name updated!");
      setNewDisplayName("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update display name",
      );
    } finally {
      setDisplayNameLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!actor || !currentPassword.trim() || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      const [currentHash, newHash] = await Promise.all([
        hashPassword(currentPassword),
        hashPassword(newPassword),
      ]);
      await actor.updatePasswordWithToken(currentHash, newHash, sessionToken);
      toast.success("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update password. Check current password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUsernameSave = async () => {
    if (!actor || !newUsername.trim()) return;
    if (Number(myBucksBalance) < 500) {
      toast.error(
        `Insufficient MyBucks. You have ${Number(myBucksBalance)}, need 500.`,
      );
      return;
    }

    setUsernameLoading(true);
    try {
      await actor.updateUsernameWithToken(newUsername.trim(), sessionToken);
      if (currentUser) {
        setCurrentUser({ ...currentUser, username: newUsername.trim() });
      }
      toast.success("Username updated! 500 MyBucks deducted.");
      setNewUsername("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update username",
      );
    } finally {
      setUsernameLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="display">
          <TabsList className="w-full bg-secondary/40 h-9">
            <TabsTrigger
              data-ocid="settings.tab"
              value="display"
              className="flex-1 text-xs"
            >
              Display Name
            </TabsTrigger>
            <TabsTrigger
              data-ocid="settings.tab"
              value="password"
              className="flex-1 text-xs"
            >
              Password
            </TabsTrigger>
            <TabsTrigger
              data-ocid="settings.tab"
              value="username"
              className="flex-1 text-xs"
            >
              Username
            </TabsTrigger>
          </TabsList>

          {/* Display Name Tab */}
          <TabsContent value="display" className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Current:{" "}
                <span className="text-foreground font-medium">
                  {currentUser?.displayName}
                </span>
                . Can be changed once every 24 hours.
              </p>
              <div className="space-y-2">
                <Label htmlFor="newDisplayName" className="text-sm">
                  New Display Name
                </Label>
                <Input
                  id="newDisplayName"
                  data-ocid="settings.displayname_input"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Enter new display name"
                  className="bg-input/50 h-10"
                  disabled={displayNameLoading}
                />
              </div>
            </div>
            <Button
              data-ocid="settings.displayname_save_button"
              onClick={handleDisplayNameSave}
              disabled={displayNameLoading || !newDisplayName.trim()}
              className="w-full bg-primary text-primary-foreground"
            >
              {displayNameLoading && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Save Display Name
            </Button>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPwd" className="text-sm">
                  Current Password
                </Label>
                <Input
                  id="currentPwd"
                  data-ocid="settings.password_current_input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="bg-input/50 h-10"
                  disabled={passwordLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPwd" className="text-sm">
                  New Password
                </Label>
                <Input
                  id="newPwd"
                  data-ocid="settings.password_new_input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min. 6 chars)"
                  className="bg-input/50 h-10"
                  disabled={passwordLoading}
                />
              </div>
            </div>
            <Button
              data-ocid="settings.password_save_button"
              onClick={handlePasswordSave}
              disabled={
                passwordLoading ||
                !currentPassword.trim() ||
                !newPassword.trim()
              }
              className="w-full bg-primary text-primary-foreground"
            >
              {passwordLoading && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Update Password
            </Button>
          </TabsContent>

          {/* Username Tab */}
          <TabsContent value="username" className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Current:{" "}
                <span className="text-foreground font-medium">
                  @{currentUser?.username}
                </span>
                .
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 mb-3">
                <div className="gold-coin flex-shrink-0">My</div>
                <p className="text-xs text-primary font-medium">
                  Costs 500 MyBucks. You have{" "}
                  <span className="font-bold">{Number(myBucksBalance)}</span>.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUsername" className="text-sm">
                  New Username
                </Label>
                <Input
                  id="newUsername"
                  data-ocid="settings.username_input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="bg-input/50 h-10"
                  disabled={usernameLoading}
                />
              </div>
            </div>
            <Button
              data-ocid="settings.username_save_button"
              onClick={handleUsernameSave}
              disabled={
                usernameLoading ||
                !newUsername.trim() ||
                Number(myBucksBalance) < 500
              }
              className="w-full bg-primary text-primary-foreground"
            >
              {usernameLoading && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Change Username (500 MyBucks)
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
