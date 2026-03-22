import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Archive, Instagram, Facebook, Twitter, Sparkles, Upload, Loader2, Image as ImageIcon } from "lucide-react";
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
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPlatform, setAiPlatform] = useState("instagram");
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("marketing-assets").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("marketing-assets").getPublicUrl(fileName);
      setForm(f => ({ ...f, image_url: publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      title: form.title, platform: form.platform || null, caption: form.caption || null,
      image_url: form.image_url || null, status: form.status,
      publish_date: form.publish_date || null, notes: form.notes || null,
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

  const handleAiGenerate = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { action: "generate_marketing", prompt: aiPrompt, platform: aiPlatform },
      });
      if (error) throw error;

      setForm({
        title: data.title || "", platform: data.platform || aiPlatform,
        caption: data.caption || "", image_url: "",
        status: "draft", publish_date: "", notes: data.notes || "",
      });
      setShowAiDialog(false);
      setAiPrompt("");
      setShowForm(true);
      toast({ title: "AI content generated — review and save" });
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const statusColors: Record<string, string> = { draft: "secondary", ready: "default", published: "default", archived: "secondary" };
  const filtered = campaigns.filter(c => filter === "all" || c.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Marketing Studio</h1>
          <p className="text-sm text-muted-foreground">Manage campaigns and content assets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiDialog(true)} className="gap-2">
            <Sparkles className="h-4 w-4" /> AI Content
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "draft", "ready", "published", "archived"].map(s => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="capitalize">{s}</Button>
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

      {/* AI Content Generator */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Marketing Content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={aiPlatform} onValueChange={setAiPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">X / Twitter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>What do you want to promote?</Label>
              <Textarea rows={4} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Promote our new budget meal planning feature — emphasize that families can eat well for under $75/week"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["New feature launch", "Budget meal tips", "Holiday meal planning", "SNAP program awareness", "User success story"].map(s => (
                <button key={s} onClick={() => setAiPrompt(s)} className="px-2.5 py-1 rounded-full border border-border bg-muted hover:bg-primary/10 transition-colors">{s}</button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Content
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Form */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

            {/* Image Upload */}
            <div className="space-y-1.5">
              <Label>Campaign Image</Label>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="Campaign" className="w-full h-40 object-cover rounded-lg border border-border" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3 w-3 mr-1" /> Replace
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setForm(f => ({ ...f, image_url: "" }))}>Remove</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload image</span>
                    </>
                  )}
                </button>
              )}
            </div>

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
