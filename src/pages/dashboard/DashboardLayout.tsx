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
        <div className="min-h-screen flex w-full overflow-x-hidden">
          {!isMobile && <DashboardSidebar />}

          <div className="flex-1 flex flex-col w-full min-w-0">
            <header className={`flex items-center justify-between border-b border-border bg-card ${isMobile ? 'px-4 py-2' : 'h-14 px-4'}`}>
              <div className="flex items-center gap-2">
                {!isMobile && <SidebarTrigger className="text-foreground" />}
                <Link to="/dashboard" className="flex items-center gap-2">
                  <img src={logo} alt="Help The Hive" className={isMobile ? "h-7 w-7" : "h-8 w-8"} />
                  {isMobile && (
                    <span className="font-display text-base font-bold text-foreground">
                      Help <span className="text-gradient-honey">The Hive</span>
                    </span>
                  )}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9">
                  <Bell className="h-5 w-5" />
                </Button>
                <Link to="/dashboard/settings">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </header>
            <main className={`flex-1 bg-background overflow-y-auto ${isMobile ? "px-4 pt-5 pb-24" : "p-6"}`} style={isMobile ? { WebkitOverflowScrolling: 'touch' } : undefined}>
              <Outlet />
            </main>
          </div>

          {isMobile && <BottomNavBar />}
        </div>
      </SidebarProvider>
    </MealPlanProvider>
  );
}
