import { useState } from "react";
import { ShoppingBasket } from "lucide-react";

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
}

/**
 * Renders a grocery item image when a real (non-keyword-matched) URL is
 * provided — typically from Open Food Facts. Falls back to a flat honey-cream
 * tile with a basket icon. Never falls back to a different food photo.
 */
export function GroceryItemImage({ src, alt, className = "" }: Props) {
  const [current, setCurrent] = useState<string | null>(src && src.trim() ? src : null);

  if (!current) {
    return (
      <div
        className={`flex items-center justify-center bg-[hsl(43_100%_96%)] ${className}`}
        aria-label={alt}
      >
        <ShoppingBasket className="w-1/2 h-1/2 text-primary/60" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      className={`w-full h-full object-cover ${className}`}
      loading="lazy"
      onError={() => setCurrent(null)}
    />
  );
}
