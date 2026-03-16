import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Star, StarOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminSpecialMeals() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: "", description: "", cover_image: "", estimated_budget: "",
    seasonal_tag: "", publish_status: "draft",
    publish_start_date: "", publish_end_date: "",
  });

  useEffect(() => { fetchCollections(); }, []);

  async function fetchCollections() {
    const { data } = await supabase.from("special_meal_collections").select("*").order("created_at", { ascending: false });
    if (data) setCollections(data);
    setLoading(false);
  }

  const resetForm = () => {
    setForm({ title: "", description: "", cover_image: "", estimated_budget: "", seasonal_tag: "", publish_status: "draft", publish_start_date: "", publish_end_date: "" });
    setEditing(null);
  };

  const openEdit = (c: any) => {
    setForm({
      title: c.title || "", description: c.description || "", cover_image: c.cover_image || "",
      estimated_budget: String(c.estimated_budget || ""), seasonal_tag: c.seasonal_tag || "",
      publish_status: c.publish_status || "draft",
      publish_start_date: c.publish_start_date || "", publish_end_date: c.publish_end_date || "",
    });
    setEditing(c);
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      description: form.description || null,
      cover_image: form.cover_image || null,
      estimated_budget: form.estimated_budget ? Number(form.estimated_budget) : null,
      seasonal_tag: form.seasonal_tag || null,
      publish_status: form.publish_status,
      publish_start_date: form.publish_start_date || null,
      publish_end_date: form.publish_end_date || null,
      created_by: user?.id,
    };

    if (editing) {
      await supabase.from("special_meal_collections").update(payload).eq("id", editing.id);
      toast({ title: "Collection updated" });
    } else {
      await supabase.from("special_meal_collections").insert(payload);
      toast({ title: "Collection created" });
    }
    setShowForm(false); resetForm(); fetchCollections();
  };

  const toggleFeatured = async (c: any) => {
    await supabase.from("special_meal_collections").update({ is_featured: !c.is_featured }).eq("id", c.id);
    fetchCollections();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Special Meals</h1>
          <p className="text-sm text-muted-foreground">Seasonal and curated collections</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Collection
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : collections.length === 0 ? (
        <Card className="bg-card border-border"><CardContent className="p-8 text-center text-muted-foreground">No collections yet. Create your first one!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(c => (
            <Card key={c.id} className="bg-card border-border overflow-hidden">
              {c.cover_image && (
                <div className="h-32 bg-muted">
                  <img src={c.cover_image} alt={c.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    {c.seasonal_tag && <Badge variant="secondary" className="text-xs mt-1">{c.seasonal_tag}</Badge>}
                  </div>
                  <Badge variant={c.publish_status === "published" ? "default" : "secondary"} className="text-xs capitalize">{c.publish_status}</Badge>
                </div>
                {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                {c.estimated_budget && <p className="text-sm font-medium text-primary">${c.estimated_budget} budget</p>}
                <div className="flex gap-1 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleFeatured(c)}>
                    {c.is_featured ? <StarOff className="h-3.5 w-3.5 mr-1" /> : <Star className="h-3.5 w-3.5 mr-1" />}
                    {c.is_featured ? "Unfeature" : "Feature"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Collection" : "New Collection"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Budget ($)</Label><Input type="number" value={form.estimated_budget} onChange={e => setForm(f => ({ ...f, estimated_budget: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Seasonal Tag</Label><Input value={form.seasonal_tag} onChange={e => setForm(f => ({ ...f, seasonal_tag: e.target.value }))} placeholder="e.g. Thanksgiving" /></div>
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.publish_start_date} onChange={e => setForm(f => ({ ...f, publish_start_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.publish_end_date} onChange={e => setForm(f => ({ ...f, publish_end_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Cover Image URL</Label><Input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} /></div>
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
