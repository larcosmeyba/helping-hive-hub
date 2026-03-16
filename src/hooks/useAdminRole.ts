import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdminRole = "owner" | "admin" | "content_manager" | "moderator" | null;

export interface AdminPermissions {
  view_members: boolean;
  edit_members: boolean;
  export_data: boolean;
  view_snap_data: boolean;
  manage_recipes: boolean;
  manage_meal_plans: boolean;
  manage_special_meals: boolean;
  manage_marketing: boolean;
  view_analytics: boolean;
  invite_remove_admins: boolean;
  edit_settings: boolean;
}

const FULL_PERMISSIONS: AdminPermissions = {
  view_members: true,
  edit_members: true,
  export_data: true,
  view_snap_data: true,
  manage_recipes: true,
  manage_meal_plans: true,
  manage_special_meals: true,
  manage_marketing: true,
  view_analytics: true,
  invite_remove_admins: true,
  edit_settings: true,
};

const NO_PERMISSIONS: AdminPermissions = {
  view_members: false,
  edit_members: false,
  export_data: false,
  view_snap_data: false,
  manage_recipes: false,
  manage_meal_plans: false,
  manage_special_meals: false,
  manage_marketing: false,
  view_analytics: false,
  invite_remove_admins: false,
  edit_settings: false,
};

export function useAdminRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(NO_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setPermissions(NO_PERMISSIONS);
      setLoading(false);
      return;
    }

    async function fetchRole() {
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id);

        if (!roles || roles.length === 0) {
          setRole(null);
          setPermissions(NO_PERMISSIONS);
          setLoading(false);
          return;
        }

        // Priority: owner > admin > content_manager > moderator
        const priority: AdminRole[] = ["owner", "admin", "content_manager", "moderator"];
        const highestRole = priority.find(r => roles.some(ur => ur.role === r)) || null;
        setRole(highestRole);

        if (highestRole === "owner") {
          setPermissions(FULL_PERMISSIONS);
        } else {
          const { data: perms } = await supabase
            .from("admin_permissions")
            .select("*")
            .eq("user_id", user!.id)
            .single();

          if (perms) {
            setPermissions({
              view_members: perms.view_members,
              edit_members: perms.edit_members,
              export_data: perms.export_data,
              view_snap_data: perms.view_snap_data,
              manage_recipes: perms.manage_recipes,
              manage_meal_plans: perms.manage_meal_plans,
              manage_special_meals: perms.manage_special_meals,
              manage_marketing: perms.manage_marketing,
              view_analytics: perms.view_analytics,
              invite_remove_admins: perms.invite_remove_admins,
              edit_settings: perms.edit_settings,
            });
          } else {
            setPermissions(NO_PERMISSIONS);
          }
        }
      } catch (err) {
        console.error("Failed to fetch admin role:", err);
        setRole(null);
        setPermissions(NO_PERMISSIONS);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return { role, permissions, loading, isOwner: role === "owner", isAdmin: role !== null };
}
