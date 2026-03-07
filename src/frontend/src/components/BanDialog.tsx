import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldOff } from "lucide-react";
import { useApp } from "../context/AppContext";

interface BanDialogProps {
  daysRemaining: number;
  onClose?: () => void;
}

export default function BanDialog({ daysRemaining, onClose }: BanDialogProps) {
  const { logout } = useApp();

  const handleClose = () => {
    logout();
    onClose?.();
  };

  return (
    <Dialog open>
      <DialogContent
        data-ocid="ban.dialog"
        className="glass-panel border-destructive/40 max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/15 border border-destructive/30 mx-auto mb-3">
            <ShieldOff className="w-7 h-7 text-destructive" />
          </div>
          <DialogTitle className="font-display text-xl text-center">
            Account Banned
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Your account is banned.{" "}
            <span className="font-semibold text-destructive">
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-center">
          <Button variant="destructive" onClick={handleClose} className="px-8">
            Return to Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
