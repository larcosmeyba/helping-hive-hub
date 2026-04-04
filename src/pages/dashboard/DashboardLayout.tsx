import { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { BottomNavBar } from "@/components/dashboard/BottomNavBar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { MealPlanProvider } from "@/contexts/MealPlanContext";
import { User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-transparent.png";

export default function DashboardLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const main = document.getElementById("dashboard-main");
    if (!main) return;
    const handler = () => setScrolled(main.scrollTop > 8);
    main.addEventListener("scroll", handler, { passive: true });
    return () => main.removeEventListener("scroll", handler);
  }, [isMobile]);

  return (
    <MealPlanProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full overflow-x-hidden">
          {!isMobile && <DashboardSidebar />}

          <div className="flex-1 flex flex-col w-full min-w-0">
            {/* Native-style header */}
            <header
              className={cn(
                "flex items-center justify-between bg-card transition-shadow duration-200",
                isMobile
                  ? "h-[72px] px-4 pt-[env(safe-area-inset-top)]"
                  : "h-16 px-4",
                scrolled && "shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
              )}
              style={isMobile ? { minHeight: "calc(72px + env(safe-area-inset-top))" } : undefined}
            >
              <Link to="/dashboard" className="flex items-center">
                <img src={logo} alt="Help The Hive" className="h-8 w-8" />
              </Link>

              <Link
                to="/dashboard/settings"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/60 hover:bg-muted transition-colors"
              >
                <User className="h-[18px] w-[18px] text-foreground/70" />
              </Link>
            </header>

            {/* Divider */}
            <div className="h-px w-full" style={{ backgroundColor: "#E8E2D8" }} />

            <main
              id="dashboard-main"
              className={cn(
                "flex-1 bg-background overflow-y-auto",
                isMobile ? "px-4 pt-5 pb-28" : "p-6"
              )}
              style={isMobile ? { WebkitOverflowScrolling: "touch" } : undefined}
            >
              <Outlet />
            </main>
          </div>

          {isMobile && (
            <>
              <NotificationBell />
              <BottomNavBar />
            </>
          )}
        </div>
      </SidebarProvider>
    </MealPlanProvider>
  );
}
