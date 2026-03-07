import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLatestUnreadSender, useUnreadCount } from "../hooks/useQueries";

export default function NotificationBell() {
  const { data: unreadCount = 0n } = useUnreadCount();
  const { data: latestSender } = useLatestUnreadSender();
  const prevUnreadCount = useRef<bigint>(0n);
  const prevSender = useRef<string | null>(null);
  const [notifList, setNotifList] = useState<{ id: string; text: string }[]>(
    [],
  );
  const [open, setOpen] = useState(false);

  // Show toast when new message arrives
  useEffect(() => {
    if (
      unreadCount > prevUnreadCount.current &&
      latestSender &&
      latestSender !== prevSender.current
    ) {
      toast.custom(
        () => (
          <div
            data-ocid="notification.toast"
            className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3 min-w-[260px] animate-slide-in"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">New message</div>
              <div className="text-sm font-semibold text-foreground">
                from {latestSender}
              </div>
            </div>
          </div>
        ),
        { position: "top-right", duration: 4000 },
      );

      setNotifList((prev) => {
        const updated = [
          {
            id: `notif-${Date.now()}-${latestSender}`,
            text: `New message from ${latestSender}`,
          },
          ...prev,
        ];
        return updated.slice(0, 10);
      });
      prevSender.current = latestSender;
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, latestSender]);

  const hasUnread = unreadCount > 0n;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-ocid="nav.bell_button"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          aria-label="Notifications"
          onClick={() => setOpen(!open)}
        >
          <Bell className="w-5 h-5" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background animate-pulse-dot" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="notification.popover"
        align="end"
        className="glass-panel border-border w-72 p-0"
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Notifications</h3>
          {hasUnread && (
            <span className="text-xs text-primary">
              {Number(unreadCount)} unread
            </span>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto scrollbar-thin">
          {notifList.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifList.map((n) => (
              <div
                key={n.id}
                className="px-4 py-3 border-b border-border/50 last:border-0 text-sm text-foreground/90"
              >
                {n.text}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
