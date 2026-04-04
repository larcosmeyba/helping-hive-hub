import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CalendarDays, TrendingUp, MapPin, UserCheck, ShoppingCart, Utensils, Target, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminAnalytics() {
  const [data, setData] = useState({
    totalMembers: 0, activeMembers: 0, snapUsers: 0, betaUsers: 0,
    totalRecipes: 0, totalMealPlans: 0,
    completedQuestionnaires: 0, avgBudget: 0, avgHousehold: 0,
    typeBreakdown: {} as Record<string, number>,
    locationBreakdown: {} as Record<string, number>,
    growthByMonth: [] as { month: string; count: number }[],
    topGoals: {} as Record<string, number>,
    topCuisines: {} as Record<string, number>,
    topStores: {} as Record<string, number>,
    cookingStyleBreakdown: {} as Record<string, number>,
    verificationBreakdown: {} as Record<string, number>,
    tierBreakdown: {} as Record<string, number>,
    referralBreakdown: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [profiles, recipes, mealPlans] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("recipes").select("id", { count: "exact" }),
        supabase.from("meal_plans").select("id", { count: "exact" }),
      ]);

      const members = profiles.data || [];
      const active = members.filter(m => m.account_status === "active").length;
      const snap = members.filter(m => m.snap_status).length;
      const beta = members.filter(m => (m as any).beta_user).length;
      const completed = members.filter(m => m.questionnaire_completed).length;
      const budgets = members.filter(m => m.weekly_budget).map(m => Number(m.weekly_budget));
      const avgBudget = budgets.length ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0;
      const households = members.filter(m => m.household_size).map(m => m.household_size);
      const avgHousehold = households.length ? (households.reduce((a, b) => a + b, 0) / households.length).toFixed(1) : "0";

      const typeBreakdown: Record<string, number> = {};
      const locationBreakdown: Record<string, number> = {};
      const monthCounts: Record<string, number> = {};
      const topGoals: Record<string, number> = {};
      const topCuisines: Record<string, number> = {};
      const topStores: Record<string, number> = {};
      const cookingStyleBreakdown: Record<string, number> = {};
      const verificationBreakdown: Record<string, number> = {};
      const tierBreakdown: Record<string, number> = {};
      const referralBreakdown: Record<string, number> = {};

      members.forEach(m => {
        const t = m.user_type || "other";
        typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;

        const loc = m.state || "Unknown";
        locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;

        const month = new Date(m.created_at).toISOString().slice(0, 7);
        monthCounts[month] = (monthCounts[month] || 0) + 1;

        (m.user_goals || []).forEach((g: string) => { topGoals[g] = (topGoals[g] || 0) + 1; });
        (m.food_preferences || []).forEach((c: string) => { topCuisines[c] = (topCuisines[c] || 0) + 1; });
        (m.preferred_stores || []).forEach((s: string) => { topStores[s] = (topStores[s] || 0) + 1; });

        const cs = m.cooking_style || "Not set";
        cookingStyleBreakdown[cs] = (cookingStyleBreakdown[cs] || 0) + 1;

        const vs = m.verification_status || "none";
        verificationBreakdown[vs] = (verificationBreakdown[vs] || 0) + 1;

        const tier = m.membership_tier || "standard";
        tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;

        const ref = (m as any).referral_source || "Unknown";
        referralBreakdown[ref] = (referralBreakdown[ref] || 0) + 1;
      });

      const growthByMonth = Object.entries(monthCounts).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));

      setData({
        totalMembers: members.length, activeMembers: active, snapUsers: snap, betaUsers: beta,
        totalRecipes: recipes.count || 0, totalMealPlans: mealPlans.count || 0,
        completedQuestionnaires: completed, avgBudget, avgHousehold: Number(avgHousehold),
        typeBreakdown, locationBreakdown, growthByMonth,
        topGoals, topCuisines, topStores, cookingStyleBreakdown,
        verificationBreakdown, tierBreakdown, referralBreakdown,
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading analytics...</p>;

  const snapPct = data.totalMembers > 0 ? Math.round((data.snapUsers / data.totalMembers) * 100) : 0;
  const questPct = data.totalMembers > 0 ? Math.round((data.completedQuestionnaires / data.totalMembers) * 100) : 0;

  const BarChart = ({ items, max }: { items: [string, number][]; max: number }) => (
    <div className="space-y-2">
      {items.map(([label, count]) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-sm capitalize text-foreground truncate max-w-[140px]">{label}</span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const sortedEntries = (obj: Record<string, number>, limit = 10) =>
    Object.entries(obj).sort(([, a], [, b]) => b - a).slice(0, limit);

  const statCards = [
    { label: "Total Members", value: data.totalMembers, icon: Users },
    { label: "Beta Users", value: data.betaUsers, icon: TrendingUp },
    { label: "Active Members", value: data.activeMembers, icon: UserCheck },
    { label: "SNAP Users", value: data.snapUsers, icon: TrendingUp },
    { label: "Recipes", value: data.totalRecipes, icon: BookOpen },
    { label: "Meal Plans", value: data.totalMealPlans, icon: CalendarDays },
    { label: "Avg Budget", value: `$${data.avgBudget}`, icon: ShoppingCart },
    { label: "Onboarding", value: `${questPct}%`, icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform insights, user engagement, and growth metrics</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <s.icon className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Goals — What members benefit from most */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Top User Goals</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(data.topGoals).length === 0 ? (
              <p className="text-sm text-muted-foreground">No goal data yet</p>
            ) : (
              <BarChart items={sortedEntries(data.topGoals)} max={Math.max(...Object.values(data.topGoals))} />
            )}
          </CardContent>
        </Card>

        {/* Popular Cuisines */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Utensils className="h-4 w-4 text-primary" /> Popular Cuisines</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(data.topCuisines).length === 0 ? (
              <p className="text-sm text-muted-foreground">No cuisine data yet</p>
            ) : (
              <BarChart items={sortedEntries(data.topCuisines)} max={Math.max(...Object.values(data.topCuisines))} />
            )}
          </CardContent>
        </Card>

        {/* Top Stores */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Preferred Stores</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(data.topStores).length === 0 ? (
              <p className="text-sm text-muted-foreground">No store data yet</p>
            ) : (
              <BarChart items={sortedEntries(data.topStores)} max={Math.max(...Object.values(data.topStores))} />
            )}
          </CardContent>
        </Card>

        {/* Cooking Style */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Cooking Styles</CardTitle></CardHeader>
          <CardContent>
            <BarChart items={sortedEntries(data.cookingStyleBreakdown)} max={Math.max(...Object.values(data.cookingStyleBreakdown), 1)} />
          </CardContent>
        </Card>

        {/* Member Type Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Member Type Breakdown</CardTitle></CardHeader>
          <CardContent>
            <BarChart items={sortedEntries(data.typeBreakdown)} max={Math.max(...Object.values(data.typeBreakdown), 1)} />
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Location Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedEntries(data.locationBreakdown).map(([loc, count]) => (
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

        {/* Membership Tiers */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Membership Tiers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedEntries(data.tierBreakdown).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize">{tier}</Badge>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Verification Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedEntries(data.verificationBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge variant={status === "verified" ? "default" : "secondary"} className="capitalize">{status}</Badge>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SNAP Usage */}
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
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (count / Math.max(...data.growthByMonth.map(g => g.count), 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-foreground w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Referral Sources */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Referral Sources</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(data.referralBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No referral data yet</p>
            ) : (
              <BarChart items={sortedEntries(data.referralBreakdown)} max={Math.max(...Object.values(data.referralBreakdown))} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
