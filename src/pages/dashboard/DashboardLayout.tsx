import { Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { BottomNavBar } from "@/components/dashboard/BottomNavBar";
import { useAuth } from "@/contexts/AuthContext";
import { MealPlanProvider } from "@/contexts/MealPlanContext";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo-transparent.png";

export default function DashboardLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <MealPlanProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          {/* Desktop sidebar — hidden on mobile */}
          {!isMobile && <DashboardSidebar />}

          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
              <div className="flex items-center gap-2">
                {!isMobile && <SidebarTrigger className="text-foreground" />}
                <Link to="/dashboard" className="flex items-center gap-2">
                  <img src={logo} alt="Help The Hive" className="h-8 w-8" />
                  {isMobile && (
                    <span className="font-display text-lg font-bold text-foreground">
                      Help <span className="text-gradient-honey">The Hive</span>
                    </span>
                  )}
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Bell className="h-5 w-5" />
                </Button>
                <Link to="/dashboard/settings">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </header>
            <main className={`flex-1 bg-background p-4 md:p-6 overflow-auto ${isMobile ? "pb-20" : ""}`}>
              <Outlet />
            </main>
          </div>

          {/* Mobile bottom nav */}
          {isMobile && <BottomNavBar />}
        </div>
      </SidebarProvider>
    </MealPlanProvider>
  );
}
