import { useState } from "react";
import { Clock, Flame, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import type { MealPlanMeal } from "@/types/mealPlan";

// Curated food images mapped by keyword
const MEAL_IMAGES: Record<string, string> = {
  chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
  salmon: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
  soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  egg: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop",
  oatmeal: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
  sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop",
  stir: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
  taco: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
  beef: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop",
  bean: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=400&h=300&fit=crop",
  smoothie: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&h=300&fit=crop",
  toast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";

function getMealImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, url] of Object.entries(MEAL_IMAGES)) {
    if (lower.includes(keyword)) return url;
  }
  return DEFAULT_IMAGE;
}

interface Props {
  meal: MealPlanMeal;
  compact?: boolean;
}

export function MealCard({ meal, compact }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-card rounded-lg md:rounded-xl border border-border shadow-card overflow-hidden group hover:shadow-elevated transition-shadow ${compact ? 'aspect-square' : ''}`}>
      <div className={`relative ${compact ? 'h-2/3' : 'h-20 md:h-32'} overflow-hidden`}>
        <img
          src={getMealImage(meal.name)}
          alt={meal.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-0.5 left-0.5 md:top-2 md:left-2">
          <span className="bg-primary/90 text-primary-foreground text-[7px] md:text-[10px] font-semibold px-1 py-0.5 rounded-full uppercase tracking-wide">
            {meal.type}
          </span>
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1 md:p-2">
          <p className="text-white text-[9px] md:text-sm font-semibold line-clamp-2 leading-tight">{meal.name}</p>
        </div>
      </div>

      <div className={`${compact ? 'p-1' : 'p-1.5 md:p-3'}`}>
        <div className={`flex items-center ${compact ? 'gap-1 text-[7px]' : 'gap-2 md:gap-3 text-[9px] md:text-xs'} text-muted-foreground`}>
          <span className="flex items-center gap-0.5"><Flame className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5 md:w-3 md:h-3'} text-primary`} />{meal.calories}</span>
          <span className="flex items-center gap-0.5"><DollarSign className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5 md:w-3 md:h-3'} text-accent`} />${meal.estimatedCost.toFixed(0)}</span>
        </div>

        {!compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            {expanded ? "Hide" : "View"} Recipe
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {expanded && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Ingredients</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {meal.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span> {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Instructions</p>
              <ol className="text-xs text-muted-foreground space-y-1">
                {meal.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground pt-1">
              <span>{meal.protein}g protein</span>
              <span>{meal.carbs}g carbs</span>
              <span>{meal.fats}g fat</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
