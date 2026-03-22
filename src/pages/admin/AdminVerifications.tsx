import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, ShieldX, Clock, Eye, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface VerificationDoc {
  id: string;
  user_id: string;
  eligibility_category: string;
  document_url: string;
  document_type: string;
  file_name: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: { display_name: string | null; email: string | null };
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const CATEGORY_LABELS: Record<string, string> = {
  snap: "SNAP / EBT",
  military: "Active Military",
  veteran: "Veteran",
  teacher: "Teacher",
  student: "College Student",
  first_responder: "First Responder",
};

export default function AdminVerifications() {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<VerificationDoc | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("verification_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch profiles for each doc
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      const enriched = data.map((doc: any) => ({
        ...doc,
        profile: profiles?.find((p: any) => p.user_id === doc.user_id),
      }));
      setDocs(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleAction = async (docId: string, userId: string, category: string, action: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      // Update verification document
      await supabase.from("verification_documents").update({
        status: action,
        admin_notes: adminNotes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", docId);

      // Update profile verification status and membership
      if (action === "approved") {
        const discount = category === "snap" ? 100 : ["military", "veteran", "first_responder"].includes(category) ? 50 : 40;
        const tier = category === "snap" ? "free" : "discounted";
        const badge = `Verified ${CATEGORY_LABELS[category] || category}`;

        await supabase.from("profiles").update({
          verification_status: "verified",
          verification_badge: badge,
          verification_verified_at: new Date().toISOString(),
          membership_tier: tier,
          membership_discount: discount,
        }).eq("user_id", userId);
      } else {
        await supabase.from("profiles").update({
          verification_status: "rejected",
          membership_tier: "standard",
          membership_discount: 0,
        }).eq("user_id", userId);
      }

      toast({ title: action === "approved" ? "Verified ✓" : "Rejected", description: `Member verification has been ${action}.` });
      setSelectedDoc(null);
      setAdminNotes("");
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = docs.filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verification Dashboard</h1>
          <p className="text-muted-foreground text-sm">Review and approve member eligibility verifications</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{docs.filter((d) => d.status === "pending").length}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{docs.filter((d) => d.status === "approved").length}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldX className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{docs.filter((d) => d.status === "rejected").length}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : docs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No verification requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.profile?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{doc.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{CATEGORY_LABELS[doc.eligibility_category] || doc.eligibility_category}</TableCell>
                    <TableCell className="text-sm">{doc.document_type === "idme" ? "ID.me" : "Document"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGES[doc.status]?.variant || "outline"}>
                        {STATUS_BADGES[doc.status]?.label || doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedDoc(doc); setAdminNotes(doc.admin_notes || ""); }}>
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Verification</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Member</p>
                  <p className="font-medium">{selectedDoc.profile?.display_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedDoc.profile?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{CATEGORY_LABELS[selectedDoc.eligibility_category]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={STATUS_BADGES[selectedDoc.status]?.variant}>
                    {STATUS_BADGES[selectedDoc.status]?.label}
                  </Badge>
                </div>
              </div>

              {selectedDoc.document_type !== "idme" && selectedDoc.document_url !== "pending_idme_verification" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Uploaded Document</p>
                  <p className="text-sm font-medium">{selectedDoc.file_name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      const { data } = await supabase.storage.from("verification-documents").createSignedUrl(selectedDoc.document_url, 300);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" /> View Document
                  </Button>
                </div>
              )}

              {selectedDoc.document_type === "idme" && (
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <ShieldCheck className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">ID.me Verification</p>
                  <p className="text-xs text-muted-foreground">Pending ID.me integration — manual review required</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this verification..."
                  rows={3}
                />
              </div>

              {selectedDoc.status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => handleAction(selectedDoc.id, selectedDoc.user_id, selectedDoc.eligibility_category, "approved")}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleAction(selectedDoc.id, selectedDoc.user_id, selectedDoc.eligibility_category, "rejected")}
                    disabled={actionLoading}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
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
