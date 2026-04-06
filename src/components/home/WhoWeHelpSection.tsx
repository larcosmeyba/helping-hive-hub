import { motion } from "framer-motion";
import { Users, GraduationCap, Briefcase, Leaf, Home, Shield } from "lucide-react";

const audiences = [
  { icon: Users, title: "Families", desc: "Feed your household nutritious meals without breaking the bank." },
  { icon: GraduationCap, title: "Students", desc: "Eat well on a tight student budget with quick, simple meals." },
  { icon: Briefcase, title: "Busy Households", desc: "Save time with pre-planned meals and organized grocery runs." },
  { icon: Home, title: "Budget-Conscious Homes", desc: "Maximize every dollar with plans built around your real budget." },
  { icon: Leaf, title: "Waste Reducers", desc: "Use what you have first and buy only what you need." },
  { icon: Shield, title: "Service Members", desc: "Meal planning support for military families and first responders." },
];

export function WhoWeHelpSection() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
            Who It's For
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Designed for every household
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Whether you're feeding a family of six or cooking for one, Help The Hive adapts to your life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {audiences.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group p-6 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border hover:border-primary/20"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
