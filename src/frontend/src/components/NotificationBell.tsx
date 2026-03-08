import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Megaphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { useLatestUnreadSender, useUnreadCount } from "../hooks/useQueries";

interface NotifItem {
  id: string;
  text: string;
  type: "message" | "system";
}

export default function NotificationBell() {
  const { data: unreadCount = 0n } = useUnreadCount();
  const { data: latestSender } = useLatestUnreadSender();
  const { actor } = useActor();
  const { sessionToken } = useApp();

  const prevUnreadCount = useRef<bigint>(0n);
  const prevSender = useRef<string | null>(null);
  const prevNotifCount = useRef<number>(0);
  const seenNotifIds = useRef<Set<string>>(new Set());

  const [notifList, setNotifList] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hasSysNotif, setHasSysNotif] = useState(false);

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
            id: `msg-${Date.now()}-${latestSender}`,
            text: `New message from ${latestSender}`,
            type: "message" as const,
          },
          ...prev,
        ];
        return updated.slice(0, 20);
      });
      prevSender.current = latestSender;
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, latestSender]);

  // Poll system notifications every 5 seconds
  useEffect(() => {
    if (!actor || !sessionToken) return;

    const checkNotifications = async () => {
      try {
        const notifications =
          await actor.getNotificationsWithToken(sessionToken);
        if (!notifications || notifications.length === 0) return;

        const newOnes = notifications.filter(
          (n) => !seenNotifIds.current.has(String(n.id)),
        );

        if (newOnes.length > 0) {
          setHasSysNotif(true);

          for (const notif of newOnes) {
            seenNotifIds.current.add(String(notif.id));

            // Show system notification toast
            toast.custom(
              () => (
                <div
                  data-ocid="notification.toast"
                  className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3 min-w-[260px] animate-slide-in"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-blue-400 font-semibold">
                      System
                    </div>
                    <div className="text-sm text-foreground line-clamp-2">
                      {notif.text}
                    </div>
                  </div>
                </div>
              ),
              { position: "top-right", duration: 6000 },
            );

            // Add to notif list
            setNotifList((prev) => {
              const updated = [
                {
                  id: `sys-${String(notif.id)}`,
                  text: notif.text,
                  type: "system" as const,
                },
                ...prev,
              ];
              return updated.slice(0, 20);
            });

            // Mark as read (fire-and-forget)
            actor
              .markNotificationReadWithToken(notif.id, sessionToken)
              .catch(() => {});
          }

          prevNotifCount.current = notifications.length;
        }
      } catch {
        // ignore polling errors silently
      }
    };

    // Run immediately then every 5s
    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, [actor, sessionToken]);

  const hasUnread = unreadCount > 0n || hasSysNotif;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-ocid="nav.bell_button"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          aria-label="Notifications"
          onClick={() => {
            setOpen(!open);
            if (!open) setHasSysNotif(false);
          }}
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
          {unreadCount > 0n && (
            <span className="text-xs text-primary">
              {Number(unreadCount)} unread message
              {unreadCount > 1n ? "s" : ""}
            </span>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto scrollbar-thin">
          {notifList.length === 0 ? (
            <div
              data-ocid="notification.empty_state"
              className="px-4 py-6 text-center text-sm text-muted-foreground"
            >
              No new notifications
            </div>
          ) : (
            notifList.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border/50 last:border-0 text-sm flex items-start gap-2 ${
                  n.type === "system"
                    ? "text-blue-400/90"
                    : "text-foreground/90"
                }`}
              >
                {n.type === "system" ? (
                  <Megaphone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                ) : (
                  <Bell className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                )}
                <span>{n.text}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
