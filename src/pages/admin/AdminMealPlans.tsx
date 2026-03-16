import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminMealPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("meal_plans").select("*").order("created_at", { ascending: false });
      if (data) setPlans(data);
      setLoading(false);
    }
    fetch();
  }, []);

  const viewPlan = async (plan: any) => {
    setSelectedPlan(plan);
    const { data } = await supabase.from("meal_plan_items").select("*").eq("meal_plan_id", plan.id).order("day_of_week");
    setPlanItems(data || []);
  };

  const filtered = plans.filter(p =>
    !search || p.week_start.includes(search) || (p.status || "").includes(search)
  );

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Meal Plans</h1>
          <p className="text-sm text-muted-foreground">{plans.length} total meal plans</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by week or status..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week Start</TableHead>
                <TableHead className="hidden md:table-cell">Est. Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No meal plans found</TableCell></TableRow>
              ) : filtered.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.week_start}</TableCell>
                  <TableCell className="hidden md:table-cell">{plan.total_estimated_cost ? `$${plan.total_estimated_cost}` : "—"}</TableCell>
                  <TableCell><Badge variant={plan.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{plan.status || "active"}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{new Date(plan.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => viewPlan(plan)}><Eye className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Meal Plan — {selectedPlan?.week_start}</DialogTitle>
          </DialogHeader>
          {planItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items in this plan.</p>
          ) : (
            <div className="space-y-4">
              {days.map((day, idx) => {
                const dayItems = planItems.filter(i => i.day_of_week === idx);
                if (dayItems.length === 0) return null;
                return (
                  <div key={day}>
                    <h3 className="font-semibold text-sm text-foreground mb-2">{day}</h3>
                    <div className="space-y-1.5">
                      {dayItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-2 rounded bg-muted/50 text-sm">
                          <div>
                            <span className="font-medium">{item.meal_name}</span>
                            <span className="ml-2 text-xs text-muted-foreground capitalize">{item.meal_type}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{item.estimated_cost ? `$${item.estimated_cost}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
