import { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { BottomNavBar } from "@/components/dashboard/BottomNavBar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { PushPermissionModal } from "@/components/dashboard/PushPermissionModal";
import { HealthDisclaimerSheet } from "@/components/dashboard/HealthDisclaimerSheet";

import { MealPlanProvider } from "@/contexts/MealPlanContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-transparent.png";

export default function DashboardLayout() {
  const isMobile = useIsMobile();
  const { showPrimer, onPrimerContinue, onPrimerDismiss } = usePushNotifications();
  const [scrolled, setScrolled] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    if (!isMobile) return;
    const main = document.getElementById("dashboard-main");
    if (!main) return;
    const handler = () => setScrolled(main.scrollTop > 8);
    main.addEventListener("scroll", handler, { passive: true });
    return () => main.removeEventListener("scroll", handler);
  }, [isMobile]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <LocationProvider>
    <MealPlanProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full overflow-x-hidden">
          {!isMobile && <DashboardSidebar />}

          <div className="flex-1 flex flex-col w-full min-w-0">
            {isOffline && (
              <div className="bg-destructive text-destructive-foreground text-xs text-center py-2 px-4">
                You're offline — some features may not work until you reconnect.
              </div>
            )}
            <header
              className={cn(
                "bg-card transition-shadow duration-200",
                scrolled && "shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
              )}
            >
              {/* Safe area is handled by .native-app on body — no extra spacer needed */}
              <div className="flex items-center justify-between px-4 h-10">
                <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
                  <img src={logo} alt="Help The Hive" className="h-9 w-9" />
                </Link>

                <Link
                  to="/dashboard/settings"
                  className="flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors w-10 h-10 shrink-0"
                >
                  <User className="h-5 w-5 text-foreground/70" />
                </Link>
              </div>
            </header>

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
          <PushPermissionModal
            open={showPrimer}
            onContinue={onPrimerContinue}
            onDismiss={onPrimerDismiss}
          />
          <HealthDisclaimerSheet />
        </div>
      </SidebarProvider>
    </MealPlanProvider>
    </LocationProvider>
  );
}
