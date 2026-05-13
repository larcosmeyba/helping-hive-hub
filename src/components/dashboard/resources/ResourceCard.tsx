import { Link } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";

export interface ResourceCardData {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  tags?: string[] | null;
  hours?: unknown;
  is_national?: boolean;
}

function isOpenNow(hours: unknown): boolean {
  if (!hours || typeof hours !== "object") return false;
  return (hours as Record<string, unknown>).all === "24/7";
}

export function ResourceCard({ r }: { r: ResourceCardData }) {
  const open = isOpenNow(r.hours);
  return (
    <Link
      to={`/dashboard/resources/detail/${r.id}`}
      className="block bg-card rounded-2xl border border-border p-4 hover:border-primary/40 transition-colors"
      style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{r.name}</h3>
        {r.is_national && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            National
          </span>
        )}
      </div>

      {(r.address || r.city) && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mb-1">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="truncate">{[r.address, r.city, r.state].filter(Boolean).join(", ")}</span>
        </p>
      )}
      {r.phone && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
          <Phone className="w-3 h-3 shrink-0" />
          {r.phone}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-wrap gap-1">
          {(r.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground/70">
              {t}
            </span>
          ))}
        </div>
        {open && (
          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Open Now
          </span>
        )}
      </div>
    </Link>
  );
}
