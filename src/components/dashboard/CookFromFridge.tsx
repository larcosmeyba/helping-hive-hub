import { useState } from "react";
import { ChefHat, Sparkles, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";

const COMMON_ITEMS = ["Chicken", "Rice", "Eggs", "Pasta", "Beans", "Potatoes", "Onions", "Tomatoes", "Cheese", "Bread", "Butter", "Milk"];

export function CookFromFridge() {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customItem, setCustomItem] = useState("");

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
    <div className="bg-gradient-to-br from-card to-secondary/30 rounded-lg border border-border p-2.5 md:p-6 shadow-card md:max-w-none">
      <div className="flex items-center gap-1.5 mb-1.5 md:mb-4">
        <div className="bg-primary/10 rounded-md p-1 md:p-2">
          <ChefHat className="w-3.5 h-3.5 md:w-6 md:h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xs md:text-lg font-semibold text-foreground">Fridge Chef</h2>
          <p className="text-[8px] md:text-sm text-muted-foreground">Select ingredients — we'll find recipes.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 md:gap-2 mb-1.5 md:mb-4">
        {COMMON_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => toggle(item)}
            className={`px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-full text-[8px] md:text-xs font-medium border transition-all ${
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
      <div className="flex gap-1 md:gap-2 mb-1.5 md:mb-4">
        <Input
          value={customItem}
          onChange={(e) => setCustomItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add ingredient..."
          className="text-[9px] md:text-sm h-6 md:h-9"
        />
        <Button size="sm" variant="outline" onClick={addCustom} className="shrink-0 h-6 w-6 md:h-9 md:w-auto p-0 md:px-3">
          <Plus className="w-2.5 h-2.5" />
        </Button>
      </div>

      {selectedItems.filter((i) => !COMMON_ITEMS.includes(i)).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedItems.filter((i) => !COMMON_ITEMS.includes(i)).map((item) => (
            <span key={item} className="flex items-center gap-0.5 bg-accent/10 text-accent text-[8px] md:text-xs font-medium px-1.5 py-0.5 rounded-full">
              {item}
              <button onClick={() => toggle(item)}><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link
          to={`/dashboard/pantry`}
          className="text-[8px] md:text-xs text-muted-foreground hover:text-primary underline"
        >
          Manage Pantry →
        </Link>
        <Button
          disabled={selectedItems.length === 0}
          onClick={() => navigate("/dashboard/fridge-chef", { state: { ingredients: selectedItems } })}
          className="bg-gradient-honey text-primary-foreground hover:opacity-90 ml-auto h-6 text-[9px] px-2 md:h-9 md:text-sm md:px-4"
          size="sm"
        >
          <Sparkles className="w-2.5 h-2.5 mr-0.5 md:w-3.5 md:h-3.5 md:mr-1.5" />
          Find Recipes ({selectedItems.length})
        </Button>
      </div>
    </div>
  );
}
