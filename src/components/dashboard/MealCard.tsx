import { useState } from "react";
import { Flame, DollarSign, ChevronDown, ChevronUp, Refrigerator } from "lucide-react";
import { motion } from "framer-motion";
import type { MealPlanMeal } from "@/types/mealPlan";
import { ReportIssueButton } from "./ReportIssueButton";
import { MacroBadges } from "./MacroBadges";
import { SendRecipeToInstacartButton } from "./SendRecipeToInstacartButton";
import { useShowMacros } from "@/hooks/useShowMacros";

import { MealImage } from "./MealImage";
interface Props {
  meal: MealPlanMeal;
  compact?: boolean;
  onClick?: () => void;
}

export function MealCard({ meal, compact, onClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showMacros] = useShowMacros();

  // Detect "leftover" / pantry-only meals (Fix 2.5: no more bare "—")
  const isLeftover = /leftover/i.test(meal.name);
  const hasPrice = meal.costPerServing != null && meal.costPerServing > 0;
  const showPantryLabel = !hasPrice && isLeftover;
  const showEstLabel = !hasPrice && !isLeftover;

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
        <MealImage
          meal={meal}
          className="w-full h-full"
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

      <div className={compact ? 'p-1 space-y-1' : 'p-3 space-y-2'}>
        <div className={`flex items-center gap-2 text-muted-foreground flex-wrap ${compact ? 'text-[8px]' : 'text-sm'}`}>
          <span className="flex items-center gap-0.5"><Flame className={`text-primary ${compact ? 'w-2 h-2' : 'w-3.5 h-3.5'}`} />{meal.calories}</span>
          {hasPrice && (
            <span className="flex items-center gap-0.5 text-primary font-medium">
              <DollarSign className={compact ? 'w-2 h-2' : 'w-3 h-3'} />${meal.costPerServing!.toFixed(2)}{compact ? '' : '/srv'}
            </span>
          )}
          {showPantryLabel && (
            <span className={`inline-flex items-center gap-0.5 text-accent font-medium ${compact ? '' : ''}`}>
              <Refrigerator className={compact ? 'w-2 h-2' : 'w-3 h-3'} />
              {compact ? 'Pantry' : 'Pantry · No new cost'}
            </span>
          )}
          {showEstLabel && (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground italic">
              {compact ? 'Est.' : 'Est. pricing'}
            </span>
          )}
        </div>
        {showMacros && (
          <MacroBadges
            protein={meal.protein}
            carbs={meal.carbs}
            fats={meal.fats}
            size={compact ? "xs" : "sm"}
          />
        )}

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
            <div className="pt-1">
              <SendRecipeToInstacartButton
                title={meal.name}
                ingredients={meal.ingredients}
                instructions={meal.instructions}
                imageUrl={meal.imageUrl}
                size="sm"
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>{meal.protein}g protein</span>
              <span>{meal.carbs}g carbs</span>
              <span>{meal.fats}g fat</span>
              <span className="ml-auto">
                <ReportIssueButton entityType="meal" entityName={meal.name} />
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
