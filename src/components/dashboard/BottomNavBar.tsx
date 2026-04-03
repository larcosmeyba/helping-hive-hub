import { LayoutDashboard, CalendarDays, Package, ShoppingCart, ChefHat, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Today", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "Meal Plan", to: "/dashboard/meal-plan", icon: CalendarDays },
  { label: "Pantry", to: "/dashboard/pantry", icon: Package },
  { label: "Grocery", to: "/dashboard/grocery-list", icon: ShoppingCart },
  { label: "Fridge Chef", to: "/dashboard/fridge-chef", icon: ChefHat },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
];

export function BottomNavBar() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-lg safe-area-bottom" style={{ boxShadow: '0 -1px 12px -4px rgba(0,0,0,0.1)' }}>
      <div className="flex items-center justify-around h-[72px] px-2">
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
                "flex flex-col items-center justify-center gap-1.5 flex-1 py-2 text-[11px] transition-colors min-h-[48px]",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground font-medium"
              )}
            >
              <tab.icon className={cn("h-[26px] w-[26px] transition-colors", isActive ? "text-primary" : "text-muted-foreground")} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="truncate">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
