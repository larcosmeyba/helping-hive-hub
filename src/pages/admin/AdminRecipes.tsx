import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Copy, Eye, EyeOff, Sparkles, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", description: "", category: "", cook_time_minutes: "",
    serving_size: "4", cost_estimate: "", calories: "",
    protein_g: "", carbs_g: "", fats_g: "", image_url: "",
    ingredients: "", instructions: "", is_public: true,
  });

  useEffect(() => { fetchRecipes(); }, []);

  async function fetchRecipes() {
    const { data } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
    if (data) setRecipes(data);
    setLoading(false);
  }

  const resetForm = () => {
    setForm({ title: "", description: "", category: "", cook_time_minutes: "", serving_size: "4", cost_estimate: "", calories: "", protein_g: "", carbs_g: "", fats_g: "", image_url: "", ingredients: "", instructions: "", is_public: true });
    setEditingRecipe(null);
  };

  const openEdit = (recipe: any) => {
    setForm({
      title: recipe.title || "", description: recipe.description || "", category: recipe.category || "",
      cook_time_minutes: String(recipe.cook_time_minutes || ""), serving_size: String(recipe.serving_size || 4),
      cost_estimate: String(recipe.cost_estimate || ""), calories: String(recipe.calories || ""),
      protein_g: String(recipe.protein_g || ""), carbs_g: String(recipe.carbs_g || ""),
      fats_g: String(recipe.fats_g || ""), image_url: recipe.image_url || "",
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.join("\n") : "",
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions.join("\n") : "",
      is_public: recipe.is_public !== false,
    });
    setEditingRecipe(recipe);
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title, description: form.description || null, category: form.category || null,
      cook_time_minutes: form.cook_time_minutes ? Number(form.cook_time_minutes) : null,
      serving_size: form.serving_size ? Number(form.serving_size) : 4,
      cost_estimate: form.cost_estimate ? Number(form.cost_estimate) : null,
      calories: form.calories ? Number(form.calories) : null,
      protein_g: form.protein_g ? Number(form.protein_g) : null,
      carbs_g: form.carbs_g ? Number(form.carbs_g) : null,
      fats_g: form.fats_g ? Number(form.fats_g) : null,
      image_url: form.image_url || null,
      ingredients: form.ingredients.split("\n").filter(Boolean),
      instructions: form.instructions.split("\n").filter(Boolean),
      is_public: form.is_public,
    };

    if (editingRecipe) {
      const { error } = await supabase.from("recipes").update(payload).eq("id", editingRecipe.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Recipe updated" });
    } else {
      const { error } = await supabase.from("recipes").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Recipe created" });
    }
    setShowForm(false); resetForm(); fetchRecipes();
  };

  const togglePublish = async (recipe: any) => {
    await supabase.from("recipes").update({ is_public: !recipe.is_public }).eq("id", recipe.id);
    fetchRecipes();
  };

  const duplicate = async (recipe: any) => {
    const { id, created_at, ...rest } = recipe;
    await supabase.from("recipes").insert({ ...rest, title: `${rest.title} (Copy)` });
    fetchRecipes();
    toast({ title: "Recipe duplicated" });
  };

  const deleteRecipe = async (recipe: any) => {
    if (!confirm(`Delete "${recipe.title}"?`)) return;
    await supabase.from("recipes").delete().eq("id", recipe.id);
    fetchRecipes();
    toast({ title: "Recipe deleted" });
  };

  const handleAiGenerate = async (saveToDb: boolean) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { action: "generate_recipe", prompt: aiPrompt, saveToDb },
      });
      if (error) throw error;

      if (saveToDb) {
        toast({ title: "Recipe created by AI and saved!" });
        setShowAiDialog(false);
        setAiPrompt("");
        fetchRecipes();
      } else {
        // Load into form for editing
        setForm({
          title: data.title || "", description: data.description || "", category: data.category || "",
          cook_time_minutes: String(data.cook_time_minutes || ""), serving_size: String(data.serving_size || 4),
          cost_estimate: String(data.cost_estimate || ""), calories: String(data.calories || ""),
          protein_g: String(data.protein_g || ""), carbs_g: String(data.carbs_g || ""),
          fats_g: String(data.fats_g || ""), image_url: "",
          ingredients: (data.ingredients || []).join("\n"),
          instructions: (data.instructions || []).join("\n"),
          is_public: true,
        });
        setShowAiDialog(false);
        setAiPrompt("");
        setShowForm(true);
        toast({ title: "AI recipe loaded — review and save" });
      }
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message || "Failed to generate recipe", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const categories = ["all", ...new Set(recipes.map(r => r.category).filter(Boolean))];

  const filtered = recipes.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.category || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || r.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Recipes</h1>
          <p className="text-sm text-muted-foreground">{recipes.length} recipes in library</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiDialog(true)} className="gap-2">
            <Sparkles className="h-4 w-4" /> AI Generate
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Recipe
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Button key={cat} variant={categoryFilter === cat ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter(cat)} className="capitalize text-xs">
                {cat}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipe Grid for visual overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <p className="col-span-full text-center text-muted-foreground py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-8">No recipes found</p>
        ) : filtered.map(recipe => (
          <Card key={recipe.id} className="bg-card border-border overflow-hidden group">
            {recipe.image_url ? (
              <div className="h-36 overflow-hidden">
                <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
            ) : (
              <div className="h-36 bg-muted flex items-center justify-center">
                <span className="text-3xl">🍽️</span>
              </div>
            )}
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-foreground line-clamp-1">{recipe.title}</h3>
                <Badge variant={recipe.is_public ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {recipe.is_public ? "Live" : "Draft"}
                </Badge>
              </div>
              {recipe.category && <Badge variant="secondary" className="text-[10px]">{recipe.category}</Badge>}
              <div className="flex gap-3 text-xs text-muted-foreground">
                {recipe.cost_estimate && <span>${recipe.cost_estimate}</span>}
                {recipe.cook_time_minutes && <span>{recipe.cook_time_minutes}m</span>}
                {recipe.serving_size && <span>{recipe.serving_size} srv</span>}
              </div>
              {recipe.calories && (
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span>{recipe.calories} cal</span>
                  {recipe.protein_g && <span>{recipe.protein_g}g P</span>}
                  {recipe.carbs_g && <span>{recipe.carbs_g}g C</span>}
                  {recipe.fats_g && <span>{recipe.fats_g}g F</span>}
                </div>
              )}
              <div className="flex gap-1 pt-2 border-t border-border">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(recipe)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicate(recipe)}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePublish(recipe)}>
                  {recipe.is_public ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteRecipe(recipe)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Recipe Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>What kind of recipe do you want?</Label>
              <Textarea
                rows={4}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. A budget-friendly Mexican chicken dinner under $8 that feeds 4 people, ready in 30 minutes"
              />
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              {["Budget dinner under $8", "Quick 15-min lunch", "Slow cooker family meal", "High protein meal prep", "Vegetarian pantry staple"].map(s => (
                <button key={s} onClick={() => setAiPrompt(s)} className="px-2.5 py-1 rounded-full border border-border bg-muted hover:bg-primary/10 transition-colors">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleAiGenerate(false)} disabled={aiLoading || !aiPrompt}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate & Edit
              </Button>
              <Button onClick={() => handleAiGenerate(true)} disabled={aiLoading || !aiPrompt}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingRecipe ? "Edit Recipe" : "Add Recipe"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Budget Dinner" /></div>
            <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Cost Estimate ($)</Label><Input type="number" value={form.cost_estimate} onChange={e => setForm(f => ({ ...f, cost_estimate: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Cook Time (min)</Label><Input type="number" value={form.cook_time_minutes} onChange={e => setForm(f => ({ ...f, cook_time_minutes: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Servings</Label><Input type="number" value={form.serving_size} onChange={e => setForm(f => ({ ...f, serving_size: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Calories</Label><Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Protein (g)</Label><Input type="number" value={form.protein_g} onChange={e => setForm(f => ({ ...f, protein_g: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Carbs (g)</Label><Input type="number" value={form.carbs_g} onChange={e => setForm(f => ({ ...f, carbs_g: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fats (g)</Label><Input type="number" value={form.fats_g} onChange={e => setForm(f => ({ ...f, fats_g: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Ingredients (one per line)</Label><Textarea rows={5} value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Instructions (one step per line)</Label><Textarea rows={5} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} /></div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} id="is_public" />
              <Label htmlFor="is_public">Publish immediately</Label>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.title}>{editingRecipe ? "Update" : "Create"} Recipe</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
