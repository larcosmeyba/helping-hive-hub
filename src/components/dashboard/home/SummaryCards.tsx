import { MapPin, Wallet, Users, PiggyBank } from "lucide-react";

interface Props {
  zip: string;
  city?: string;
  budget: number;
  household: number;
  saved: number;
}

export function SummaryCards({ zip, city, budget, household, saved }: Props) {
  const items = [
    { icon: MapPin, label: zip || "—", sub: city ?? "ZIP" },
    { icon: Wallet, label: `$${Math.round(budget)}/wk`, sub: "Budget" },
    { icon: Users, label: `${household}`, sub: household === 1 ? "Person" : "People" },
    { icon: PiggyBank, label: `$${Math.max(0, Math.round(saved))}`, sub: "Saved" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((it) => (
        <div
          key={it.sub}
          className="bg-card border border-border rounded-2xl px-2.5 py-2.5 flex flex-col items-start gap-0.5"
          style={{ boxShadow: "0px 4px 10px rgba(0,0,0,0.03)" }}
        >
          <it.icon className="w-3.5 h-3.5 text-primary mb-0.5" />
          <p className="text-xs md:text-sm font-bold text-foreground leading-tight truncate w-full">{it.label}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{it.sub}</p>
        </div>
      ))}
    </div>
  );
}
