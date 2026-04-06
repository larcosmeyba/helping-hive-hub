import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users as UsersIcon, DollarSign, X, ShoppingCart, ChefHat } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import recipeChickenRice from "@/assets/recipe-chicken-rice.jpg";
import recipeStirFry from "@/assets/recipe-stir-fry.jpg";
import recipePantryPasta from "@/assets/recipe-pantry-pasta.jpg";
import recipeBudgetBowl from "@/assets/recipe-budget-bowl.jpg";

const recipes = [
  {
    title: "$10 Family Dinner",
    time: "30 min",
    servings: "4",
    cost: "$10",
    desc: "Hearty one-pot chicken and rice dinner.",
    image: recipeChickenRice,
    calories: 520,
    protein: 35,
    carbs: 55,
    fats: 14,
    ingredients: [
      "2 lbs chicken thighs",
      "2 cups long grain rice",
      "1 large onion, diced",
      "3 cloves garlic, minced",
      "2 cups chicken broth",
      "1 bag frozen mixed veggies",
      "2 tbsp olive oil",
      "1 tsp paprika",
      "Salt and pepper to taste",
    ],
    instructions: [
      "Season chicken thighs with paprika, salt, and pepper.",
      "Heat olive oil in a large pot over medium-high heat. Sear chicken on both sides until golden, about 4 minutes per side. Remove and set aside.",
      "In the same pot, sauté diced onion and garlic until softened, about 3 minutes.",
      "Add rice and stir to coat in the oil. Cook for 1 minute.",
      "Pour in chicken broth, add frozen veggies, and stir. Place chicken on top.",
      "Bring to a boil, then reduce heat to low. Cover and cook for 20 minutes until rice is tender and chicken is cooked through.",
      "Let rest 5 minutes, fluff rice with a fork, and serve.",
    ],
  },
  {
    title: "$15 Stir Fry Night",
    time: "25 min",
    servings: "4",
    cost: "$15",
    desc: "Colorful veggie stir fry with protein.",
    image: recipeStirFry,
    calories: 420,
    protein: 30,
    carbs: 38,
    fats: 16,
    ingredients: [
      "1 lb chicken breast, sliced thin",
      "2 cups broccoli florets",
      "1 red bell pepper, sliced",
      "1 cup snap peas",
      "2 carrots, julienned",
      "3 tbsp soy sauce",
      "1 tbsp sesame oil",
      "1 tbsp cornstarch",
      "2 cloves garlic, minced",
      "1 inch ginger, grated",
      "Cooked rice for serving",
    ],
    instructions: [
      "Mix soy sauce, sesame oil, cornstarch, garlic, and ginger in a small bowl for the sauce.",
      "Heat a large skillet or wok over high heat with a drizzle of oil.",
      "Cook chicken slices for 4-5 minutes until browned. Remove and set aside.",
      "Add broccoli, bell pepper, snap peas, and carrots. Stir fry for 3-4 minutes until crisp-tender.",
      "Return chicken to the pan and pour the sauce over everything.",
      "Toss to coat and cook 1-2 minutes until sauce thickens.",
      "Serve immediately over steamed rice.",
    ],
  },
  {
    title: "Pantry Pasta Dinner",
    time: "20 min",
    servings: "4",
    cost: "$8",
    desc: "Made from common pantry staples.",
    image: recipePantryPasta,
    calories: 450,
    protein: 14,
    carbs: 60,
    fats: 16,
    ingredients: [
      "1 lb spaghetti or penne",
      "1 can (28 oz) crushed tomatoes",
      "4 cloves garlic, minced",
      "1/4 cup olive oil",
      "1 tsp red pepper flakes",
      "1/2 tsp dried oregano",
      "1/2 tsp dried basil",
      "Salt and pepper to taste",
      "Parmesan cheese for topping",
    ],
    instructions: [
      "Cook pasta according to package directions. Reserve 1 cup pasta water before draining.",
      "While pasta cooks, heat olive oil in a large skillet over medium heat.",
      "Add garlic and red pepper flakes, cook 1 minute until fragrant (don't burn!).",
      "Pour in crushed tomatoes, oregano, basil, salt, and pepper. Simmer 10 minutes.",
      "Add drained pasta to the sauce and toss to coat. Add pasta water as needed for consistency.",
      "Serve topped with grated Parmesan cheese.",
    ],
  },
  {
    title: "Healthy Budget Bowl",
    time: "35 min",
    servings: "4",
    cost: "$12",
    desc: "Nutrient-packed grain bowl on a budget.",
    image: recipeBudgetBowl,
    calories: 480,
    protein: 22,
    carbs: 58,
    fats: 18,
    ingredients: [
      "2 cups brown rice or quinoa",
      "1 can (15 oz) chickpeas, drained",
      "2 cups sweet potato, cubed",
      "2 cups kale or spinach",
      "1 avocado, sliced",
      "2 tbsp olive oil",
      "1 tsp cumin",
      "1 tsp smoked paprika",
      "Juice of 1 lemon",
      "2 tbsp tahini",
      "Salt and pepper to taste",
    ],
    instructions: [
      "Preheat oven to 400°F. Toss sweet potato cubes and chickpeas with olive oil, cumin, paprika, salt, and pepper.",
      "Spread on a baking sheet and roast for 25 minutes until sweet potatoes are tender and chickpeas are crispy.",
      "While roasting, cook brown rice or quinoa according to package directions.",
      "Make the dressing: whisk tahini, lemon juice, 2 tbsp water, and a pinch of salt.",
      "Massage kale with a drizzle of olive oil and a squeeze of lemon.",
      "Assemble bowls: rice base, roasted sweet potato and chickpeas, kale, avocado slices.",
      "Drizzle with tahini dressing and serve.",
    ],
  },
];

export function RecipeShowcase() {
  const [selectedRecipe, setSelectedRecipe] = useState<(typeof recipes)[0] | null>(null);

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Recipe Showcase
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Delicious, affordable recipes your family will love. Click any recipe to see the full details.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {recipes.map((recipe, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedRecipe(recipe)}
              className="rounded-2xl bg-card shadow-card border border-border overflow-hidden hover:shadow-elevated transition-all duration-300 group cursor-pointer"
            >
              <div className="h-44 overflow-hidden">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display text-base font-semibold text-foreground mb-2">{recipe.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{recipe.desc}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{recipe.time}</span>
                  <span className="flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" />{recipe.servings}</span>
                  <span className="flex items-center gap-1 text-primary font-semibold"><DollarSign className="w-3.5 h-3.5" />{recipe.cost}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {selectedRecipe && (
            <>
              <div className="relative h-56 md:h-64 overflow-hidden">
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">{selectedRecipe.title}</h2>
                  <p className="text-white/80 text-sm">{selectedRecipe.desc}</p>
                </div>
              </div>

              <div className="p-5 md:p-6 space-y-6">
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3">
                  <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                    <DollarSign className="w-4 h-4" />{selectedRecipe.cost}
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-sm">
                    <Clock className="w-4 h-4" />{selectedRecipe.time}
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-sm">
                    <UsersIcon className="w-4 h-4" />{selectedRecipe.servings} servings
                  </span>
                </div>

                {/* Nutrition */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Calories", value: selectedRecipe.calories, unit: "cal", color: "bg-amber-50 text-amber-700 border-amber-200" },
                    { label: "Protein", value: selectedRecipe.protein, unit: "g", color: "bg-red-50 text-red-700 border-red-200" },
                    { label: "Carbs", value: selectedRecipe.carbs, unit: "g", color: "bg-blue-50 text-blue-700 border-blue-200" },
                    { label: "Fats", value: selectedRecipe.fats, unit: "g", color: "bg-green-50 text-green-700 border-green-200" },
                  ].map((n) => (
                    <div key={n.label} className={`text-center p-3 rounded-xl border ${n.color}`}>
                      <p className="text-lg font-bold">{n.value}{n.unit === "cal" ? "" : n.unit}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wide">{n.label}</p>
                    </div>
                  ))}
                </div>

                {/* Ingredients */}
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" /> Ingredients
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-primary" /> Instructions
                  </h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
