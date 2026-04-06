import { useState } from "react";
import { Flame, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import type { MealPlanMeal } from "@/types/mealPlan";

const MEAL_IMAGES: Record<string, string> = {
  chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
  salmon: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
  soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  egg: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop",
  oatmeal: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
  oat: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
  sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop",
  stir: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
  taco: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
  beef: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop",
  bean: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=400&h=300&fit=crop",
  smoothie: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&h=300&fit=crop",
  toast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
  peanut: "https://images.unsplash.com/photo-1598511726623-d2e9996892f0?w=400&h=300&fit=crop",
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
  onClick?: () => void;
}

export function MealCard({ meal, compact, onClick }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className={`bg-card rounded-2xl border border-border shadow-card overflow-hidden group hover:shadow-elevated transition-shadow ${compact ? 'min-w-0 cursor-pointer' : 'w-full'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={compact && onClick ? onClick : undefined}
    >
      <div className={`relative overflow-hidden ${compact ? 'h-20' : 'h-28 md:h-32'}`}>
        <img
          src={getMealImage(meal.name)}
          alt={meal.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
        />
        <div className="absolute top-1 left-1">
          <span className={`bg-primary/90 text-primary-foreground font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${compact ? 'text-[7px]' : 'text-[10px]'}`}>
            {meal.type}
          </span>
        </div>
        <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent ${compact ? 'p-1.5' : 'p-3'}`}>
          <p className={`text-white font-semibold line-clamp-2 leading-tight ${compact ? 'text-[9px]' : 'text-sm'}`}>{meal.name}</p>
        </div>
      </div>

      <div className={compact ? 'p-1' : 'p-3'}>
        <div className={`flex items-center gap-1 text-muted-foreground ${compact ? 'text-[8px]' : 'text-sm'}`}>
          <span className="flex items-center gap-0.5"><Flame className={`text-primary ${compact ? 'w-2 h-2' : 'w-3.5 h-3.5'}`} />{meal.calories}</span>
        </div>

        {!compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-sm text-primary font-medium hover:underline"
          >
            {expanded ? "Hide" : "View"} Recipe
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {expanded && (
          <motion.div
            className="mt-3 space-y-3 border-t border-border pt-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Ingredients</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {meal.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span> {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Instructions</p>
              <ol className="text-sm text-muted-foreground space-y-1.5">
                {meal.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground pt-1">
              <span>{meal.protein}g protein</span>
              <span>{meal.carbs}g carbs</span>
              <span>{meal.fats}g fat</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
