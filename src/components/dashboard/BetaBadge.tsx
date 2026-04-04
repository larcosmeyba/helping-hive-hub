import { Sparkles } from "lucide-react";

export function BetaBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tracking-wide uppercase">
      <Sparkles className="w-2.5 h-2.5" />
      Beta
    </div>
  );
}
