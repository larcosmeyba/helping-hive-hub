import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, CalendarDays, Sparkles, TrendingUp, UserPlus, Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalMembers: number;
  newMembersThisWeek: number;
  totalRecipes: number;
  totalMealPlans: number;
  totalSpecialCollections: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalMembers: 0, newMembersThisWeek: 0, totalRecipes: 0, totalMealPlans: 0, totalSpecialCollections: 0 });
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAiRecipe, setShowAiRecipe] = useState(false);
  const [aiRecipePrompt, setAiRecipePrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchStats() {
      try {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const [profiles, recipes, mealPlans, collections] = await Promise.all([
          supabase.from("profiles").select("id, created_at, display_name, email", { count: "exact" }),
          supabase.from("recipes").select("id", { count: "exact" }),
          supabase.from("meal_plans").select("id", { count: "exact" }),
          supabase.from("special_meal_collections").select("id", { count: "exact" }),
        ]);
        const newThisWeek = (profiles.data || []).filter(p => new Date(p.created_at) >= weekAgo).length;
        setStats({
          totalMembers: profiles.count || 0, newMembersThisWeek: newThisWeek,
          totalRecipes: recipes.count || 0, totalMealPlans: mealPlans.count || 0,
          totalSpecialCollections: collections.count || 0,
        });
        setRecentMembers((profiles.data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));
      } catch (err) { console.error("Failed to fetch dashboard stats:", err); }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  const handleAiRecipe = async () => {
    setAiLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-ai", {
        body: { action: "generate_recipe", prompt: aiRecipePrompt, saveToDb: true },
      });
      if (error) throw error;
      toast({ title: "AI Recipe created and saved!" });
      setShowAiRecipe(false); setAiRecipePrompt("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  const statCards = [
    { label: "Total Members", value: stats.totalMembers, icon: Users, color: "text-primary" },
    { label: "New This Week", value: stats.newMembersThisWeek, icon: UserPlus, color: "text-accent" },
    { label: "Recipes", value: stats.totalRecipes, icon: BookOpen, color: "text-primary" },
    { label: "Meal Plans", value: stats.totalMealPlans, icon: CalendarDays, color: "text-primary" },
    { label: "Special Collections", value: stats.totalSpecialCollections, icon: Sparkles, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with Help The Hive</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(stat => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? "—" : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base font-semibold">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowAiRecipe(true)}>
              <Sparkles className="h-4 w-4 text-primary" /> AI Generate Recipe
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/admin/recipes"><Plus className="h-4 w-4" /> Add Recipe Manually</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/admin/meal-plans"><Plus className="h-4 w-4" /> View Meal Plans</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/admin/special-meals"><Plus className="h-4 w-4" /> New Special Collection</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/admin/marketing"><Sparkles className="h-4 w-4 text-primary" /> Marketing Studio</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to="/admin/admins"><Plus className="h-4 w-4" /> Invite Admin</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Members */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Members</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/members">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recentMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              <div className="space-y-3">
                {recentMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{(member.display_name || member.email || "?")[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.display_name || "No name"}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(member.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Recipe Quick Dialog */}
      <Dialog open={showAiRecipe} onOpenChange={setShowAiRecipe}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Quick AI Recipe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>What recipe should AI create?</Label>
              <Textarea rows={3} value={aiRecipePrompt} onChange={e => setAiRecipePrompt(e.target.value)}
                placeholder="e.g. A healthy chicken stir fry under $10 for 4 people"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Budget dinner under $8", "Quick 15-min lunch", "High protein meal prep", "Vegetarian family meal"].map(s => (
                <button key={s} onClick={() => setAiRecipePrompt(s)} className="px-2.5 py-1 rounded-full border border-border bg-muted hover:bg-primary/10 transition-colors">{s}</button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAiRecipe} disabled={aiLoading || !aiRecipePrompt}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
