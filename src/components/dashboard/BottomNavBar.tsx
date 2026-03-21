import { LayoutDashboard, CalendarDays, Package, ShoppingCart, ChefHat, TrendingUp } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Today", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "Meal Plan", to: "/dashboard/meal-plan", icon: CalendarDays },
  { label: "Pantry", to: "/dashboard/pantry", icon: Package },
  { label: "Grocery", to: "/dashboard/grocery-list", icon: ShoppingCart },
  { label: "Smart Meals", to: "/dashboard/fridge-chef", icon: ChefHat },
  { label: "Budget", to: "/dashboard/budget", icon: TrendingUp },
];

export function BottomNavBar() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
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
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="truncate">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
