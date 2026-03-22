import { useState, useRef } from "react";
import { BookOpen, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock, DollarSign, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const FEATURED_RECIPES = [
  { title: "One-Pot Chicken & Rice", cost: 8.50, time: 35, servings: 4, image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop", ingredients: ["2 lbs chicken thighs", "2 cups rice", "1 can diced tomatoes", "2 cups chicken broth", "1 onion, diced", "3 cloves garlic"], instructions: ["Season chicken with salt and pepper.", "Brown chicken in a Dutch oven, remove.", "Sauté onion and garlic 3 min.", "Add rice, tomatoes, broth. Nestle chicken on top.", "Cover, cook 25 min until rice is tender."] },
  { title: "Budget Beef Tacos", cost: 9.20, time: 25, servings: 4, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", ingredients: ["1 lb ground beef", "8 taco shells", "1 can black beans", "Shredded lettuce", "Diced tomatoes", "Shredded cheese"], instructions: ["Brown beef with taco seasoning.", "Warm beans in a small pot.", "Heat taco shells per package directions.", "Assemble tacos with toppings.", "Serve with lime wedges."] },
  { title: "15-Minute Fried Rice", cost: 6.00, time: 15, servings: 4, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop", ingredients: ["3 cups cooked rice", "2 eggs", "1 cup frozen mixed vegetables", "3 tbsp soy sauce", "2 green onions", "Sesame oil"], instructions: ["Heat oil in a wok over high heat.", "Scramble eggs, set aside.", "Stir-fry vegetables 2 min.", "Add rice, soy sauce. Toss 3 min.", "Mix in eggs, top with green onions."] },
  { title: "Sheet Pan Fajitas", cost: 10.00, time: 25, servings: 4, image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop", ingredients: ["1.5 lbs chicken breast", "3 bell peppers", "1 large onion", "2 tbsp fajita seasoning", "Tortillas", "Sour cream"], instructions: ["Preheat oven to 425°F.", "Slice chicken, peppers, onion.", "Toss with oil and seasoning on a sheet pan.", "Roast 20 min, tossing halfway.", "Serve in warm tortillas."] },
  { title: "Slow Cooker Chili", cost: 9.00, time: 240, servings: 6, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", ingredients: ["1.5 lbs ground turkey", "2 cans kidney beans", "1 can crushed tomatoes", "1 onion", "Chili powder", "Cumin"], instructions: ["Brown turkey with onion.", "Add all ingredients to slow cooker.", "Cook on low 6-8 hours.", "Season to taste.", "Serve with cornbread."] },
  { title: "Pasta Primavera", cost: 7.50, time: 20, servings: 4, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", ingredients: ["1 lb penne pasta", "2 cups mixed vegetables", "3 cloves garlic", "Olive oil", "Parmesan cheese", "Fresh basil"], instructions: ["Cook pasta al dente.", "Sauté garlic and vegetables in olive oil.", "Toss pasta with vegetables.", "Season with salt, pepper, red pepper flakes.", "Top with parmesan and basil."] },
];

export function ExtraRecipes() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 180;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="font-display text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Extra Recipes
        </h2>
        <div className="flex items-center gap-2">
          {isMobile && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("left")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("right")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Link to="/dashboard/recipes" className="flex items-center gap-1 text-sm text-primary hover:underline font-medium">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {isMobile ? (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {FEATURED_RECIPES.map((recipe) => (
            <div
              key={recipe.title}
              className="snap-start shrink-0 w-[150px] bg-card rounded-2xl border border-border shadow-card overflow-hidden"
            >
              <div className="relative h-[110px] overflow-hidden">
                <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white font-semibold text-xs leading-tight line-clamp-2">{recipe.title}</p>
                </div>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3 text-accent" />${recipe.cost.toFixed(0)}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{recipe.time < 60 ? `${recipe.time}m` : `${Math.floor(recipe.time / 60)}h`}</span>
                  <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{recipe.servings}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_RECIPES.map((recipe, idx) => (
            <div key={recipe.title} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden hover:shadow-elevated transition-shadow">
              <div className="relative h-36 overflow-hidden cursor-pointer" onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white font-semibold text-sm">{recipe.title}</p>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-accent" />${recipe.cost.toFixed(2)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.time < 60 ? `${recipe.time}m` : `${Math.floor(recipe.time / 60)}h`}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>
                </div>
                <button
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className="mt-2 flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  {expandedIdx === idx ? "Hide" : "View"} Recipe
                  {expandedIdx === idx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expandedIdx === idx && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3 animate-in slide-in-from-top-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Ingredients</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i} className="flex items-start gap-1"><span className="text-primary">•</span> {ing}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Instructions</p>
                      <ol className="text-xs text-muted-foreground space-y-1">
                        {recipe.instructions.map((step, i) => (
                          <li key={i} className="flex gap-2"><span className="text-primary font-bold shrink-0">{i + 1}.</span>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
