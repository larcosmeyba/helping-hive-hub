import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CalendarDays, TrendingUp, MapPin, UserCheck } from "lucide-react";

export default function AdminAnalytics() {
  const [data, setData] = useState({
    totalMembers: 0, activeMembers: 0, snapUsers: 0,
    totalRecipes: 0, totalMealPlans: 0,
    typeBreakdown: {} as Record<string, number>,
    locationBreakdown: {} as Record<string, number>,
    growthByMonth: [] as { month: string; count: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [profiles, recipes, mealPlans] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("recipes").select("id", { count: "exact" }),
        supabase.from("meal_plans").select("id", { count: "exact" }),
      ]);

      const members = profiles.data || [];
      const active = members.filter(m => m.account_status === "active").length;
      const snap = members.filter(m => m.snap_status).length;

      const typeBreakdown: Record<string, number> = {};
      const locationBreakdown: Record<string, number> = {};
      const monthCounts: Record<string, number> = {};

      members.forEach(m => {
        const t = m.user_type || "other";
        typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;

        const loc = m.state || "Unknown";
        locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;

        const month = new Date(m.created_at).toISOString().slice(0, 7);
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });

      const growthByMonth = Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      setData({
        totalMembers: members.length, activeMembers: active, snapUsers: snap,
        totalRecipes: recipes.count || 0, totalMealPlans: mealPlans.count || 0,
        typeBreakdown, locationBreakdown, growthByMonth,
      });
      setLoading(false);
    }
    fetch();
  }, []);

  const statCards = [
    { label: "Total Members", value: data.totalMembers, icon: Users },
    { label: "Active Members", value: data.activeMembers, icon: UserCheck },
    { label: "SNAP Users", value: data.snapUsers, icon: TrendingUp },
    { label: "Recipes", value: data.totalRecipes, icon: BookOpen },
    { label: "Meal Plans", value: data.totalMealPlans, icon: CalendarDays },
  ];

  if (loading) return <p className="text-muted-foreground">Loading analytics...</p>;

  const snapPct = data.totalMembers > 0 ? Math.round((data.snapUsers / data.totalMembers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform insights and growth metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-5">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Type Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Member Type Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.typeBreakdown).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-foreground">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(count / data.totalMembers) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Location Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.locationBreakdown).sort(([, a], [, b]) => b - a).slice(0, 10).map(([loc, count]) => (
                <div key={loc} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{loc}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SNAP Percentage */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">SNAP Usage</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${snapPct}, 100`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">{snapPct}%</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{data.snapUsers} of {data.totalMembers} members</p>
              <p className="text-sm text-muted-foreground">use SNAP benefits</p>
            </div>
          </CardContent>
        </Card>

        {/* Growth Trend */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Member Growth</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.growthByMonth.slice(-6).map(({ month, count }) => (
                <div key={month} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{month}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (count / Math.max(...data.growthByMonth.map(g => g.count))) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-foreground w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
