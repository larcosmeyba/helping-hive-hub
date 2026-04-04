import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { cn } from "@/lib/utils";

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

      // Check profile completeness
      const { data: profile } = await supabase
        .from("profiles")
        .select("zip_code, questionnaire_completed, weekly_budget")
        .eq("user_id", user.id)
        .single();

      if (profile && !profile.zip_code) {
        items.push({ id: "zip", message: "Add your ZIP code for local store pricing", action: "/dashboard/settings" });
      }
      if (profile && !profile.questionnaire_completed) {
        items.push({ id: "questionnaire", message: "Complete your profile to get better meal plans", action: "/questionnaire" });
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
      {/* Floating bell */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-[92px] left-4 z-[45] w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center animate-in fade-in slide-in-from-left-2 duration-300"
      >
        <Bell className="w-[18px] h-[18px]" />
        <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
          {notifications.length}
        </span>
      </button>

      {/* Notification panel */}
      {open && (
        <div className="fixed bottom-[160px] left-4 right-4 z-50 bg-card rounded-2xl border border-border shadow-elevated p-4 animate-in slide-in-from-bottom-4 duration-200 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-foreground text-sm">Needs Attention</h3>
            <button onClick={() => setOpen(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="bg-muted/50 rounded-xl p-3 text-sm text-foreground">
                {n.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
