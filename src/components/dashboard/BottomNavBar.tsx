import { Home, CalendarDays, Package, ShoppingCart, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Today", to: "/dashboard", icon: Home, end: true },
  { label: "Meal Plan", to: "/dashboard/meal-plan", icon: CalendarDays },
  { label: "Pantry", to: "/dashboard/pantry", icon: Package },
  { label: "Grocery", to: "/dashboard/grocery-list", icon: ShoppingCart },
  { label: "Hive AI", to: "/dashboard/fridge-chef", icon: Sparkles },
];

export function BottomNavBar() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-bottom"
      style={{ boxShadow: "0 -2px 16px -4px rgba(0,0,0,0.12)" }}
    >
      <div className="flex items-center justify-around h-[76px] px-1">
        {tabs.map((tab) => {
          const isActive = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] transition-colors min-h-[52px] rounded-xl mx-0.5",
                isActive
                  ? "text-foreground font-bold bg-foreground/5"
                  : "text-foreground/50 font-medium hover:text-foreground/80"
              )}
            >
              <tab.icon
                className={cn(
                  "h-[22px] w-[22px] transition-all text-foreground",
                  isActive ? "opacity-100" : "opacity-60",
                )}
                strokeWidth={isActive ? 2.6 : 1.8}
                fill={isActive ? "currentColor" : "none"}
              />
              <span className={cn("truncate", isActive ? "text-foreground font-bold" : "text-foreground/60")}>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
