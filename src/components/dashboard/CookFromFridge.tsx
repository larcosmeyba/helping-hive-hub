import { useState } from "react";
import { ChefHat, Sparkles, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";

const COMMON_ITEMS = ["Chicken", "Rice", "Eggs", "Pasta", "Beans", "Potatoes", "Onions", "Tomatoes", "Cheese", "Bread", "Butter", "Milk"];

export function CookFromFridge() {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggle = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustom = () => {
    const trimmed = customItem.trim();
    if (trimmed && !selectedItems.includes(trimmed)) {
      setSelectedItems((prev) => [...prev, trimmed]);
      setCustomItem("");
    }
  };

  return (
    <div className="bg-gradient-to-br from-card to-secondary/30 rounded-2xl border border-border p-4 md:p-6 shadow-card">
      <div className="flex items-start gap-2.5 md:gap-3 mb-3 md:mb-4">
        <div className="bg-primary/10 rounded-xl p-2">
          <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-base md:text-lg font-semibold text-foreground">Fridge Chef</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Select ingredients you have — we'll find recipes.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {COMMON_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => toggle(item)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedItems.includes(item)
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Custom items */}
      <div className="flex gap-2 mb-4">
        <Input
          value={customItem}
          onChange={(e) => setCustomItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add other ingredient..."
          className="text-sm h-9"
        />
        <Button size="sm" variant="outline" onClick={addCustom} className="shrink-0 h-9">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {selectedItems.filter((i) => !COMMON_ITEMS.includes(i)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {selectedItems.filter((i) => !COMMON_ITEMS.includes(i)).map((item) => (
            <span key={item} className="flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2.5 py-1 rounded-full">
              {item}
              <button onClick={() => toggle(item)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link
          to={`/dashboard/pantry`}
          className="text-xs text-muted-foreground hover:text-primary underline"
        >
          Manage Pantry →
        </Link>
        <Button
          disabled={selectedItems.length === 0}
          className="bg-gradient-honey text-primary-foreground hover:opacity-90 ml-auto"
          size="sm"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Find Recipes ({selectedItems.length})
        </Button>
      </div>
    </div>
  );
}
