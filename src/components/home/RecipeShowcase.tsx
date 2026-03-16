import { motion } from "framer-motion";
import { Clock, Users as UsersIcon, DollarSign } from "lucide-react";

const recipes = [
  { title: "$10 Family Dinner", time: "30 min", servings: "4", cost: "$10", desc: "Hearty one-pot chicken and rice dinner." },
  { title: "$15 Stir Fry Night", time: "25 min", servings: "4", cost: "$15", desc: "Colorful veggie stir fry with protein." },
  { title: "Pantry Pasta Dinner", time: "20 min", servings: "4", cost: "$8", desc: "Made from common pantry staples." },
  { title: "Healthy Budget Bowl", time: "35 min", servings: "4", cost: "$12", desc: "Nutrient-packed grain bowl on a budget." },
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
              <div className="h-36 bg-gradient-honey opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-5xl">🍽️</span>
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
