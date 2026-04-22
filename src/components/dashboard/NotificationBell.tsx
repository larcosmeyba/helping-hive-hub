import { useState } from "react";
import { Bell, X, ChevronRight, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onClose,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  const isUnread = !notification.read_at;
  const content = (
    <div className="flex items-start gap-2 flex-1">
      {isUnread && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notification.created_at)}</p>
      </div>
    </div>
  );

  const baseClasses =
    "flex items-center justify-between gap-2 rounded-xl p-3 transition-colors " +
    (isUnread ? "bg-primary/5 hover:bg-primary/10" : "bg-muted/50 hover:bg-muted");

  if (notification.link) {
    return (
      <Link
        to={notification.link}
        onClick={() => {
          onMarkRead(notification.id);
          onClose();
        }}
        className={baseClasses}
      >
        {content}
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </Link>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
      <button
        onClick={() => onDismiss(notification.id)}
        className="p-1 rounded-full hover:bg-background/60"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);

  const total = notifications.length;
  if (total === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed z-[45] flex items-center justify-center w-12 h-12 rounded-full bg-primary shadow-lg active:scale-95 transition-transform"
        style={{ bottom: "calc(76px + 16px + env(safe-area-inset-bottom, 0px))", left: 16 }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-primary-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[44] bg-black/10" onClick={() => setOpen(false)} />
          <div
            className="fixed left-4 right-4 z-[46] bg-card rounded-2xl border border-border shadow-xl p-4 max-w-sm animate-in slide-in-from-bottom-4 duration-200"
            style={{
              bottom: "calc(76px + 16px + 56px + env(safe-area-inset-bottom, 0px))",
              maxHeight: "60vh",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-foreground text-sm">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label="Mark all as read"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(60vh - 60px)" }}>
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={markAsRead}
                  onDismiss={dismiss}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
