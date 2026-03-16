import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Filter, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const { permissions, isOwner } = useAdminRole();

  useEffect(() => {
    async function fetchMembers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setMembers(data);
      setLoading(false);
    }
    fetchMembers();
  }, []);

  const filtered = members.filter(m => {
    const matchesSearch = !search ||
      (m.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || m.user_type === filterType;
    const matchesStatus = filterStatus === "all" || m.account_status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "City", "State", "Household Size", "User Type", "SNAP", "Status", "Joined"],
      ...filtered.map(m => [
        m.display_name, m.email, m.phone_number, m.city, m.state,
        m.household_size, m.user_type, m.snap_status ? "Yes" : "No",
        m.account_status, new Date(m.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
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

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden lg:table-cell">Household</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="hidden xl:table-cell">SNAP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No members found</TableCell></TableRow>
              ) : (
                filtered.map(member => (
                  <TableRow key={member.id} className="cursor-pointer" onClick={() => setSelectedMember(member)}>
                    <TableCell className="font-medium">{member.display_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {[member.city, member.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{member.household_size || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary" className="capitalize text-xs">{member.user_type || "other"}</Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {(isOwner || permissions.view_snap_data) ? (
                        member.snap_status ? <Badge className="bg-accent text-accent-foreground text-xs">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>
                      ) : <span className="text-muted-foreground text-xs">Restricted</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.account_status === "active" ? "default" : "destructive"} className="text-xs capitalize">
                        {member.account_status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Name</span><p className="font-medium">{selectedMember.display_name || "—"}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium">{selectedMember.email || "—"}</p></div>
                <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{selectedMember.phone_number || "—"}</p></div>
                <div><span className="text-muted-foreground">Location</span><p className="font-medium">{[selectedMember.city, selectedMember.state, selectedMember.zip_code].filter(Boolean).join(", ") || "—"}</p></div>
                <div><span className="text-muted-foreground">Household Size</span><p className="font-medium">{selectedMember.household_size || "—"}</p></div>
                <div><span className="text-muted-foreground">User Type</span><p className="font-medium capitalize">{selectedMember.user_type || "other"}</p></div>
                {(isOwner || permissions.view_snap_data) && (
                  <div><span className="text-muted-foreground">SNAP Status</span><p className="font-medium">{selectedMember.snap_status ? "Yes" : "No"}</p></div>
                )}
                <div><span className="text-muted-foreground">Budget</span><p className="font-medium">${selectedMember.weekly_budget || "—"}/week</p></div>
                <div><span className="text-muted-foreground">Dietary</span><p className="font-medium">{(selectedMember.dietary_preferences || []).join(", ") || "None"}</p></div>
                <div><span className="text-muted-foreground">Allergies</span><p className="font-medium">{(selectedMember.allergies || []).join(", ") || "None"}</p></div>
                <div><span className="text-muted-foreground">Joined</span><p className="font-medium">{new Date(selectedMember.created_at).toLocaleDateString()}</p></div>
                <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{selectedMember.account_status || "active"}</p></div>
              </div>
              {(isOwner || permissions.edit_members) && (
                <div className="flex gap-2 pt-2 border-t border-border">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
