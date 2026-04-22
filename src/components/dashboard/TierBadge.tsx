import { Heart } from "lucide-react";

export function FreeForeverBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 text-primary text-xs font-bold">
      <Heart className="w-3 h-3 fill-primary" />
      Free Forever · SNAP & WIC
    </div>
  );
}
