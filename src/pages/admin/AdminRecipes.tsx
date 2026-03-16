import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Copy, Archive, Eye, EyeOff } from "lucide-react";
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
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", description: "", category: "", cook_time_minutes: "",
    serving_size: "4", cost_estimate: "", calories: "",
    protein_g: "", carbs_g: "", fats_g: "", image_url: "",
    ingredients: "", instructions: "", is_public: true,
  });

  useEffect(() => {
    fetchRecipes();
  }, []);

  async function fetchRecipes() {
    const { data } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
    if (data) setRecipes(data);
    setLoading(false);
  }

  const resetForm = () => {
    setForm({
      title: "", description: "", category: "", cook_time_minutes: "",
      serving_size: "4", cost_estimate: "", calories: "",
      protein_g: "", carbs_g: "", fats_g: "", image_url: "",
      ingredients: "", instructions: "", is_public: true,
    });
    setEditingRecipe(null);
  };

  const openEdit = (recipe: any) => {
    setForm({
      title: recipe.title || "",
      description: recipe.description || "",
      category: recipe.category || "",
      cook_time_minutes: String(recipe.cook_time_minutes || ""),
      serving_size: String(recipe.serving_size || 4),
      cost_estimate: String(recipe.cost_estimate || ""),
      calories: String(recipe.calories || ""),
      protein_g: String(recipe.protein_g || ""),
      carbs_g: String(recipe.carbs_g || ""),
      fats_g: String(recipe.fats_g || ""),
      image_url: recipe.image_url || "",
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.join("\n") : "",
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions.join("\n") : "",
      is_public: recipe.is_public !== false,
    });
    setEditingRecipe(recipe);
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category || null,
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
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Recipe updated" });
    } else {
      const { error } = await supabase.from("recipes").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Recipe created" });
    }

    setShowForm(false);
    resetForm();
    fetchRecipes();
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

  const filtered = recipes.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Recipes</h1>
          <p className="text-sm text-muted-foreground">{recipes.length} recipes in library</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Recipe
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Cost</TableHead>
                <TableHead className="hidden lg:table-cell">Time</TableHead>
                <TableHead className="hidden md:table-cell">Servings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No recipes found</TableCell></TableRow>
              ) : filtered.map(recipe => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">{recipe.title}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="secondary" className="text-xs">{recipe.category || "—"}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell">{recipe.cost_estimate ? `$${recipe.cost_estimate}` : "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m` : "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{recipe.serving_size || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={recipe.is_public ? "default" : "secondary"} className="text-xs">
                      {recipe.is_public ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(recipe)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => duplicate(recipe)}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => togglePublish(recipe)}>
                        {recipe.is_public ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
