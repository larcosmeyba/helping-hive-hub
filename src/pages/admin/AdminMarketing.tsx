import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Archive, Instagram, Facebook, Twitter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
};

export default function AdminMarketing() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: "", platform: "", caption: "", image_url: "",
    status: "draft", publish_date: "", notes: "",
  });

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    const { data } = await supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false });
    if (data) setCampaigns(data);
    setLoading(false);
  }

  const resetForm = () => {
    setForm({ title: "", platform: "", caption: "", image_url: "", status: "draft", publish_date: "", notes: "" });
    setEditing(null);
  };

  const openEdit = (c: any) => {
    setForm({
      title: c.title || "", platform: c.platform || "", caption: c.caption || "",
      image_url: c.image_url || "", status: c.status || "draft",
      publish_date: c.publish_date || "", notes: c.notes || "",
    });
    setEditing(c);
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      platform: form.platform || null,
      caption: form.caption || null,
      image_url: form.image_url || null,
      status: form.status,
      publish_date: form.publish_date || null,
      notes: form.notes || null,
      created_by: user?.id,
    };

    if (editing) {
      await supabase.from("marketing_campaigns").update(payload).eq("id", editing.id);
      toast({ title: "Campaign updated" });
    } else {
      await supabase.from("marketing_campaigns").insert(payload);
      toast({ title: "Campaign created" });
    }
    setShowForm(false); resetForm(); fetchCampaigns();
  };

  const archiveCampaign = async (id: string) => {
    await supabase.from("marketing_campaigns").update({ status: "archived" }).eq("id", id);
    fetchCampaigns();
  };

  const statusColors: Record<string, string> = {
    draft: "secondary",
    ready: "default",
    published: "default",
    archived: "secondary",
  };

  const filtered = campaigns.filter(c => filter === "all" || c.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Marketing Studio</h1>
          <p className="text-sm text-muted-foreground">Manage campaigns and content assets</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "draft", "ready", "published", "archived"].map(s => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="capitalize">
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border"><CardContent className="p-8 text-center text-muted-foreground">No campaigns found</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="bg-card border-border">
              {c.image_url && (
                <div className="h-36 bg-muted">
                  <img src={c.image_url} alt={c.title} className="w-full h-full object-cover rounded-t-lg" />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{c.title}</h3>
                  <Badge variant={(statusColors[c.status] as any) || "secondary"} className="text-xs capitalize">{c.status}</Badge>
                </div>
                {c.platform && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {platformIcons[c.platform] || null}
                    <span className="capitalize">{c.platform}</span>
                  </div>
                )}
                {c.caption && <p className="text-xs text-muted-foreground line-clamp-2">{c.caption}</p>}
                {c.publish_date && <p className="text-xs text-muted-foreground">Publish: {c.publish_date}</p>}
                <div className="flex gap-1 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  {c.status !== "archived" && (
                    <Button variant="ghost" size="sm" onClick={() => archiveCampaign(c.id)}><Archive className="h-3.5 w-3.5 mr-1" /> Archive</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Campaign" : "New Campaign"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">X / Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Caption</Label><Textarea rows={4} value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Publish Date</Label><Input type="date" value={form.publish_date} onChange={e => setForm(f => ({ ...f, publish_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.title}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
