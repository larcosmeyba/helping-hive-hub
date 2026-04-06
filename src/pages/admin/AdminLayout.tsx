import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Bell, Search, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/members": "Members",
  "/admin/meal-plans": "Meal Plans",
  "/admin/recipes": "Recipes",
  "/admin/special-meals": "Special Meals",
  "/admin/marketing": "Marketing Studio",
  "/admin/kroger-sync": "Kroger Sync",
  "/admin/analytics": "Analytics",
  "/admin/admins": "Admin Management",
  "/admin/settings": "Settings",
};

export default function AdminLayout() {
  const { user } = useAuth();
  const { role } = useAdminRole();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const pageTitle = pageTitles[location.pathname] || "Admin";
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Admin";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-foreground" />
              <h1 className="font-display text-lg font-semibold text-foreground hidden sm:block">
                {pageTitle}
              </h1>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members, recipes, campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50 border-border"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Quick Action</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to="/admin/recipes">Add Recipe</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/admin/meal-plans">Add Meal Plan</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/admin/special-meals">Add Collection</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/admin/marketing">Create Campaign</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/admin/admins">Add Admin</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
              </Button>

              {/* Profile */}
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-xs font-medium text-foreground">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{role || "admin"}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 bg-background p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
