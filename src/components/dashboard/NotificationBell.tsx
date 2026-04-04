import { useState, useEffect } from "react";
import { Bell, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  message: string;
  action?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { mealPlan } = useMealPlan();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkNotifications = async () => {
      const items: Notification[] = [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("zip_code, questionnaire_completed, weekly_budget")
        .eq("user_id", user.id)
        .single();

      if (profile && !profile.zip_code) {
        items.push({ id: "zip", message: "Add your ZIP code for local pricing", action: "/dashboard/settings" });
      }
      if (profile && !profile.questionnaire_completed) {
        items.push({ id: "questionnaire", message: "Complete your profile for better plans", action: "/questionnaire" });
      }
      if (!mealPlan) {
        items.push({ id: "meal-plan", message: "Generate your first meal plan", action: "/dashboard" });
      }

      setNotifications(items);
    };

    checkNotifications();
  }, [user, mealPlan]);

  if (notifications.length === 0) return null;

  return (
    <>
      {/* Floating bell - clean circle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed z-[45] flex items-center justify-center w-12 h-12 rounded-full bg-primary shadow-lg active:scale-95 transition-transform"
        style={{ bottom: "calc(76px + 16px + env(safe-area-inset-bottom, 0px))", left: 16 }}
      >
        <Bell className="w-5 h-5 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {notifications.length}
        </span>
      </button>

      {/* Notification panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[44] bg-black/10" onClick={() => setOpen(false)} />

          <div
            className="fixed left-4 right-4 z-[46] bg-card rounded-2xl border border-border shadow-xl p-4 max-w-sm animate-in slide-in-from-bottom-4 duration-200"
            style={{ bottom: "calc(76px + 16px + 56px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-foreground text-sm">Needs Attention</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.action || "/dashboard"}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between bg-muted/50 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <span>{n.message}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
