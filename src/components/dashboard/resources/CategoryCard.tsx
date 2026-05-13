import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  slug: string;
  title: string;
  description: string;
  icon: string;
}

export function CategoryCard({ slug, title, description, icon }: Props) {
  const Icon = ((Icons as unknown as Record<string, LucideIcon>)[icon] ?? Icons.HelpCircle) as LucideIcon;
  return (
    <Link
      to={`/dashboard/resources/${slug}`}
      className="group flex items-center gap-4 bg-card rounded-2xl border border-border p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
      style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}
    >
      <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
    </Link>
  );
}
