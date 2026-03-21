import {
  LayoutDashboard, Users, CalendarDays, BookOpen, Sparkles,
  Megaphone, BarChart3, ShieldCheck, Settings, LogOut, ChevronLeft
} from "lucide-react";
import logo from "@/assets/logo-transparent.png";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, permission: null },
  { title: "Members", url: "/admin/members", icon: Users, permission: "view_members" as const },
  { title: "Meal Plans", url: "/admin/meal-plans", icon: CalendarDays, permission: "manage_meal_plans" as const },
  { title: "Recipes", url: "/admin/recipes", icon: BookOpen, permission: "manage_recipes" as const },
  { title: "Special Meals", url: "/admin/special-meals", icon: Sparkles, permission: "manage_special_meals" as const },
  { title: "Marketing Studio", url: "/admin/marketing", icon: Megaphone, permission: "manage_marketing" as const },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, permission: "view_analytics" as const },
  { title: "Admin Management", url: "/admin/admins", icon: ShieldCheck, permission: "invite_remove_admins" as const },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { permissions, isOwner } = useAdminRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const visibleItems = navItems.filter(item => {
    if (!item.permission) return true;
    if (isOwner) return true;
    return permissions[item.permission];
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-[hsl(0,0%,20%)]">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2 border-b border-[hsl(0,0%,20%)]">
          <img src={logo} alt="Help The Hive" className="h-8 w-8 brightness-0 invert" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-base font-bold text-sidebar-foreground">
                Help The Hive
              </span>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                Admin Portal
              </span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {(isOwner || permissions.edit_settings) && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/admin/settings" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                  <Settings className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Settings</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/dashboard" className="hover:bg-sidebar-accent/50" activeClassName="">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {!collapsed && <span>Back to App</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="hover:bg-sidebar-accent/50 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
