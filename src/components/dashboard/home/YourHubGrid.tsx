import { Link } from "react-router-dom";
import { CalendarDays, ShoppingCart, Package, ChefHat, LifeBuoy, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const HUB = [
  { to: "/dashboard/meal-plan", icon: CalendarDays, title: "Meal Plan", desc: "View your weekly meal plan" },
  { to: "/dashboard/grocery-list", icon: ShoppingCart, title: "Grocery List", desc: "See your list & shop items" },
  { to: "/dashboard/pantry", icon: Package, title: "Pantry", desc: "See what you already have" },
  { to: "/dashboard/fridge-chef", icon: ChefHat, title: "Fridge Chef", desc: "Make meals from what you have" },
  { to: "/dashboard/resources", icon: LifeBuoy, title: "Resources", desc: "Find help in your area" },
  { to: "/dashboard/resources/bulk-buying", icon: ShoppingBag, title: "Bulk Buying", desc: "What to buy in bulk & save" },
];

export function YourHubGrid() {
  return (
    <div>
      <h2 className="font-display text-base md:text-lg font-bold text-foreground mb-3">Your Hub</h2>
      <motion.div
        className="grid grid-cols-3 gap-2"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {HUB.map((h) => (
          <motion.div key={h.to} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
            <Link
              to={h.to}
              className="block h-full bg-card border border-border rounded-2xl p-3 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
              style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <h.icon className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-semibold text-foreground leading-tight">{h.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{h.desc}</p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
