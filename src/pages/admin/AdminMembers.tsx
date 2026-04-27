import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Filter, ChevronRight, ArrowUpDown, ShieldOff, ShieldCheck, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function AdminMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterActivity, setFilterActivity] = useState("all"); // all | active7 | inactive14
  const [sortBy, setSortBy] = useState<"created_at" | "last_active" | "display_name">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingBulkStatus, setPendingBulkStatus] = useState<"active" | "disabled" | null>(null);
  const { permissions, isOwner } = useAdminRole();
  const { toast } = useToast();

  // H4: Only fetch sensitive PII columns when the caller has the relevant permission.
  // The base list query stays minimal; detail dialogs fetch additional fields on demand.
  const canSeeSnap = isOwner || permissions.view_snap_data;
  const canSeeFullPII = isOwner || permissions.edit_members;

  async function fetchMembers() {
    setLoading(true);
    const baseCols = [
      "id", "user_id", "display_name", "email", "city", "state", "zip_code",
      "household_size", "weekly_budget", "user_type", "account_status",
      "created_at", "last_active", "questionnaire_completed",
      "cooking_style", "cooking_time_preference", "meal_repetition",
      "preferred_stores", "kitchen_equipment", "user_goals",
      "food_preferences", "dietary_preferences",
      "tier", "membership_tier", "verification_status", "verification_badge",
    ];
    if (canSeeSnap) baseCols.push("snap_status", "snap_deposit_day", "monthly_snap_amount", "food_assistance_status");
    if (canSeeFullPII) baseCols.push("phone_number", "allergies");
    const { data, error } = await supabase
      .from("profiles")
      .select(baseCols.join(","))
      .order("created_at", { ascending: false });
    if (!error && data) setMembers(data as any[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeSnap, canSeeFullPII]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const arr = members.filter((m) => {
      const matchesSearch =
        !search ||
        (m.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.zip_code || "").includes(search);
      const matchesType = filterType === "all" || m.user_type === filterType;
      const matchesStatus = filterStatus === "all" || m.account_status === filterStatus;
      let matchesActivity = true;
      if (filterActivity !== "all") {
        const last = m.last_active ? new Date(m.last_active).getTime() : 0;
        const days = last ? (now - last) / 86400000 : Infinity;
        if (filterActivity === "active7") matchesActivity = days <= 7;
        if (filterActivity === "inactive14") matchesActivity = days > 14;
      }
      return matchesSearch && matchesType && matchesStatus && matchesActivity;
    });
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "display_name") {
        return ((a.display_name || "") > (b.display_name || "") ? 1 : -1) * dir;
      }
      const av = a[sortBy] ? new Date(a[sortBy]).getTime() : 0;
      const bv = b[sortBy] ? new Date(b[sortBy]).getTime() : 0;
      return (av - bv) * dir;
    });
    return arr;
  }, [members, search, filterType, filterStatus, filterActivity, sortBy, sortDir]);

  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((m) => m.id)));
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkUpdateStatus(status: "active" | "disabled") {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("profiles").update({ account_status: status }).in("id", ids);
    if (error) {
      toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
      return;
    }
    setMembers((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, account_status: status } : m)));
    // Audit trail — record the bulk action with affected count and IDs.
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      user_id: user?.id ?? null,
      action: status === "disabled" ? "members.bulk_disable" : "members.bulk_enable",
      entity_type: "profile",
      details: { count: ids.length, profile_ids: ids },
    });
    setSelectedIds(new Set());
    toast({
      title: `${ids.length} member${ids.length === 1 ? "" : "s"} ${status === "active" ? "enabled" : "disabled"}`,
    });
  }

  const handleExport = () => {
    const rows = someSelected ? filtered.filter((m) => selectedIds.has(m.id)) : filtered;
    const csv = [
      ["Name", "Email", "Phone", "City", "State", "ZIP", "Household Size", "Budget", "User Type", "SNAP", "Status", "Joined", "Last Active", "Food Preferences", "Dietary", "Allergies", "Cooking Style", "Kitchen Equipment", "Goals"],
      ...rows.map((m) => [
        m.display_name, m.email, m.phone_number, m.city, m.state, m.zip_code,
        m.household_size, m.weekly_budget, m.user_type, m.snap_status ? "Yes" : "No",
        m.account_status, new Date(m.created_at).toLocaleDateString(),
        m.last_active ? new Date(m.last_active).toLocaleDateString() : "",
        (m.food_preferences || []).join("; "), (m.dietary_preferences || []).join("; "),
        (m.allergies || []).join("; "), m.cooking_style, (m.kitchen_equipment || []).join("; "),
        (m.user_goals || []).join("; "),
      ]),
    ].map((row) => row.map((v) => `"${v ?? ""}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };


  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );

  const ArrayBadges = ({ items, emptyText = "None" }: { items: string[] | null; emptyText?: string }) => {
    if (!items || items.length === 0) return <span className="text-sm text-muted-foreground">{emptyText}</span>;
    return <div className="flex flex-wrap gap-1">{items.map(i => <Badge key={i} variant="secondary" className="text-[10px]">{i}</Badge>)}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground">{members.length} total members</p>
        </div>
        {(isOwner || permissions.export_data) && (
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or ZIP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="government">Gov Worker</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterActivity} onValueChange={setFilterActivity}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any activity</SelectItem>
                <SelectItem value="active7">Active in 7 days</SelectItem>
                <SelectItem value="inactive14">Inactive 14+ days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{filtered.length} of {members.length} shown</p>
        </CardContent>
      </Card>

      {someSelected && (isOwner || permissions.edit_members) && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPendingBulkStatus("active")} className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Enable
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingBulkStatus("disabled")} className="gap-1">
              <ShieldOff className="h-3.5 w-3.5" /> Disable
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("display_name")} className="flex items-center gap-1 hover:text-foreground">
                    Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden lg:table-cell">Household</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="hidden xl:table-cell">SNAP</TableHead>
                <TableHead className="hidden md:table-cell">
                  <button onClick={() => toggleSort("last_active")} className="flex items-center gap-1 hover:text-foreground">
                    Last Active <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No members found</TableCell></TableRow>
              ) : filtered.map(member => (
                <TableRow key={member.id} className="cursor-pointer" onClick={() => setSelectedMember(member)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(member.id)} onCheckedChange={() => toggleSelectOne(member.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{member.display_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{member.email || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{[member.city, member.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{member.household_size || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell"><Badge variant="secondary" className="capitalize text-xs">{member.user_type || "other"}</Badge></TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {(isOwner || permissions.view_snap_data) ? (
                      member.snap_status ? <Badge className="bg-accent text-accent-foreground text-xs">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>
                    ) : <span className="text-muted-foreground text-xs">Restricted</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {member.last_active ? new Date(member.last_active).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.account_status === "active" ? "default" : "destructive"} className="text-xs capitalize">{member.account_status || "active"}</Badge>
                  </TableCell>
                  <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member Detail Dialog — Tabbed */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedMember?.display_name || "Member"} — Details
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
                <TabsTrigger value="membership">Membership</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Name" value={selectedMember.display_name} />
                  <InfoRow label="Email" value={selectedMember.email} />
                  <InfoRow label="Phone" value={selectedMember.phone_number} />
                  <InfoRow label="Location" value={[selectedMember.city, selectedMember.state, selectedMember.zip_code].filter(Boolean).join(", ")} />
                  <InfoRow label="Household Size" value={selectedMember.household_size} />
                  <InfoRow label="Weekly Budget" value={selectedMember.weekly_budget ? `$${selectedMember.weekly_budget}` : null} />
                  <InfoRow label="Joined" value={new Date(selectedMember.created_at).toLocaleDateString()} />
                  <InfoRow label="Last Active" value={selectedMember.last_active ? new Date(selectedMember.last_active).toLocaleDateString() : null} />
                  <InfoRow label="Account Status" value={<Badge variant={selectedMember.account_status === "active" ? "default" : "destructive"} className="capitalize">{selectedMember.account_status || "active"}</Badge>} />
                </div>
              </TabsContent>

              <TabsContent value="questionnaire" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Food Preferences</span>
                    <ArrayBadges items={selectedMember.food_preferences} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Dietary Restrictions</span>
                    <ArrayBadges items={selectedMember.dietary_preferences} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Allergies</span>
                    <ArrayBadges items={selectedMember.allergies} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Cooking Time Preference" value={selectedMember.cooking_time_preference} />
                    <InfoRow label="Cooking Style" value={selectedMember.cooking_style} />
                    <InfoRow label="Meal Repetition" value={selectedMember.meal_repetition} />
                    <InfoRow label="Preferred Stores" value={(selectedMember.preferred_stores || []).join(", ")} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Kitchen Equipment</span>
                    <ArrayBadges items={selectedMember.kitchen_equipment} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">User Goals</span>
                    <ArrayBadges items={selectedMember.user_goals} />
                  </div>
                  <InfoRow label="Questionnaire Completed" value={selectedMember.questionnaire_completed ? "Yes ✓" : "No"} />
                </div>
              </TabsContent>

              <TabsContent value="membership" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="User Type" value={<span className="capitalize">{selectedMember.user_type || "other"}</span>} />
                  <InfoRow label="Membership Tier" value={<span className="capitalize">{selectedMember.membership_tier || "standard"}</span>} />
                  <InfoRow label="Eligibility Category" value={<span className="capitalize">{selectedMember.eligibility_category || "none"}</span>} />
                  {(isOwner || permissions.view_snap_data) && (
                    <InfoRow label="SNAP Status" value={selectedMember.snap_status ? <Badge className="bg-accent text-accent-foreground">Active</Badge> : "No"} />
                  )}
                  <InfoRow label="Verification Status" value={<Badge variant={selectedMember.verification_status === "verified" ? "default" : "secondary"} className="capitalize">{selectedMember.verification_status || "none"}</Badge>} />
                  <InfoRow label="Verification Badge" value={selectedMember.verification_badge} />
                  <InfoRow label="Membership Discount" value={selectedMember.membership_discount ? `${selectedMember.membership_discount}%` : "0%"} />
                  <InfoRow label="Verified At" value={selectedMember.verification_verified_at ? new Date(selectedMember.verification_verified_at).toLocaleDateString() : null} />
                </div>
              </TabsContent>
            </Tabs>
          )}
          {selectedMember && (isOwner || permissions.edit_members) && (
            <div className="flex gap-2 pt-2 border-t border-border mt-4">
              <Button size="sm" variant="outline" onClick={async () => {
                const newStatus = selectedMember.account_status === "active" ? "disabled" : "active";
                await supabase.from("profiles").update({ account_status: newStatus }).eq("id", selectedMember.id);
                setSelectedMember({ ...selectedMember, account_status: newStatus });
                setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, account_status: newStatus } : m));
              }}>
                {selectedMember.account_status === "active" ? "Disable" : "Enable"} Account
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
