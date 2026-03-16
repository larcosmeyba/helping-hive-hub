import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Shield, ShieldOff, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "content_manager" | "moderator";

const PERMISSION_LABELS: Record<string, string> = {
  view_members: "View Members",
  edit_members: "Edit Members",
  export_data: "Export Data",
  view_snap_data: "View SNAP Data",
  manage_recipes: "Manage Recipes",
  manage_meal_plans: "Manage Meal Plans",
  manage_special_meals: "Manage Special Meals",
  manage_marketing: "Manage Marketing",
  view_analytics: "View Analytics",
  invite_remove_admins: "Invite/Remove Admins",
  edit_settings: "Edit Settings",
};

export default function AdminManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permForm, setPermForm] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { isOwner } = useAdminRole();
  const { user } = useAuth();

  const [inviteForm, setInviteForm] = useState({ email: "", role: "admin" as AppRole });

  useEffect(() => { fetchAdmins(); }, []);

  async function fetchAdmins() {
    const { data: roles } = await supabase.from("user_roles").select("*");
    if (!roles) { setLoading(false); return; }

    const userIds = [...new Set(roles.map(r => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
    const { data: perms } = await supabase.from("admin_permissions").select("*").in("user_id", userIds);

    const adminList = userIds.map(uid => {
      const userRoles = roles.filter(r => r.user_id === uid);
      const profile = (profiles || []).find(p => p.user_id === uid);
      const perm = (perms || []).find(p => p.user_id === uid);
      const highestRole = userRoles.find(r => r.role === "owner")?.role
        || userRoles.find(r => r.role === "admin")?.role
        || userRoles.find(r => r.role === "content_manager")?.role
        || userRoles.find(r => r.role === "moderator")?.role || "admin";
      return { user_id: uid, role: highestRole, profile, permissions: perm };
    });

    setAdmins(adminList);
    setLoading(false);
  }

  const handleInvite = async () => {
    // Look up user by email in profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id").eq("email", inviteForm.email).limit(1);
    if (!profiles || profiles.length === 0) {
      toast({ title: "User not found", description: "This email is not registered on the platform.", variant: "destructive" });
      return;
    }

    const targetUserId = profiles[0].user_id;

    // Check if already an admin
    const { data: existing } = await supabase.from("user_roles").select("id").eq("user_id", targetUserId);
    if (existing && existing.length > 0) {
      toast({ title: "Already an admin", variant: "destructive" });
      return;
    }

    await supabase.from("user_roles").insert({ user_id: targetUserId, role: inviteForm.role });
    await supabase.from("admin_permissions").insert({ user_id: targetUserId });
    await supabase.from("activity_logs").insert({
      user_id: user?.id, action: "invited_admin", entity_type: "admin",
      entity_id: targetUserId, details: { email: inviteForm.email, role: inviteForm.role },
    });

    toast({ title: "Admin invited successfully" });
    setShowInvite(false);
    setInviteForm({ email: "", role: "admin" });
    fetchAdmins();
  };

  const openPermissions = (admin: any) => {
    setEditingAdmin(admin);
    const p = admin.permissions || {};
    const formData: Record<string, boolean> = {};
    Object.keys(PERMISSION_LABELS).forEach(k => {
      formData[k] = p[k] || false;
    });
    setPermForm(formData);
    setShowPermissions(true);
  };

  const savePermissions = async () => {
    if (!editingAdmin) return;
    await supabase.from("admin_permissions").update(permForm).eq("user_id", editingAdmin.user_id);
    await supabase.from("activity_logs").insert({
      user_id: user?.id, action: "updated_permissions", entity_type: "admin",
      entity_id: editingAdmin.user_id,
    });
    toast({ title: "Permissions updated" });
    setShowPermissions(false);
    fetchAdmins();
  };

  const removeAdmin = async (admin: any) => {
    if (admin.role === "owner") return;
    await supabase.from("user_roles").delete().eq("user_id", admin.user_id);
    await supabase.from("admin_permissions").delete().eq("user_id", admin.user_id);
    await supabase.from("activity_logs").insert({
      user_id: user?.id, action: "removed_admin", entity_type: "admin", entity_id: admin.user_id,
    });
    toast({ title: "Admin removed" });
    fetchAdmins();
  };

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Only the owner can manage admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Management</h1>
          <p className="text-sm text-muted-foreground">Manage admin access and permissions</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Invite Admin
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : admins.map(admin => (
                <TableRow key={admin.user_id}>
                  <TableCell className="font-medium">{admin.profile?.display_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{admin.profile?.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={admin.role === "owner" ? "default" : "secondary"} className="text-xs capitalize">{admin.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {admin.role !== "owner" && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openPermissions(admin)} title="Permissions">
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeAdmin(admin)} title="Remove">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Invite Admin</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Email</Label><Input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v as AppRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="content_manager">Content Manager</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!inviteForm.email}>Invite</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Permissions — {editingAdmin?.profile?.display_name || "Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch checked={permForm[key] || false} onCheckedChange={v => setPermForm(f => ({ ...f, [key]: v }))} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPermissions(false)}>Cancel</Button>
            <Button onClick={savePermissions}>Save Permissions</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
