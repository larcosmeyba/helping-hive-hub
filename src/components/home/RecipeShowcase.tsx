import { motion } from "framer-motion";
import { Clock, Users as UsersIcon, DollarSign } from "lucide-react";
import recipeChickenRice from "@/assets/recipe-chicken-rice.jpg";
import recipeStirFry from "@/assets/recipe-stir-fry.jpg";
import recipePantryPasta from "@/assets/recipe-pantry-pasta.jpg";
import recipeBudgetBowl from "@/assets/recipe-budget-bowl.jpg";

const recipes = [
  { title: "$10 Family Dinner", time: "30 min", servings: "4", cost: "$10", desc: "Hearty one-pot chicken and rice dinner.", image: recipeChickenRice },
  { title: "$15 Stir Fry Night", time: "25 min", servings: "4", cost: "$15", desc: "Colorful veggie stir fry with protein.", image: recipeStirFry },
  { title: "Pantry Pasta Dinner", time: "20 min", servings: "4", cost: "$8", desc: "Made from common pantry staples.", image: recipePantryPasta },
  { title: "Healthy Budget Bowl", time: "35 min", servings: "4", cost: "$12", desc: "Nutrient-packed grain bowl on a budget.", image: recipeBudgetBowl },
];

export function RecipeShowcase() {
  return (
    <section className="py-20 bg-background">
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
            Delicious, affordable recipes your family will love.
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
              className="rounded-2xl bg-card shadow-card border border-border overflow-hidden hover:shadow-elevated transition-all duration-300 group"
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
    </section>
  );
}
