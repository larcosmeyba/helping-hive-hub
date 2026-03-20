import { motion } from "framer-motion";
import { Users, Landmark, GraduationCap, Shield, BookOpen, Siren } from "lucide-react";

const audiences = [
  { icon: Users, title: "Families", desc: "Feed your household nutritious meals without breaking the bank." },
  { icon: Landmark, title: "SNAP Households", desc: "Maximize your benefits with optimized meal plans." },
  { icon: BookOpen, title: "Teachers", desc: "Affordable meal solutions for busy educators." },
  { icon: Siren, title: "First Responders", desc: "Quick, affordable meals for those who serve our communities." },
  { icon: Shield, title: "Military & Veterans", desc: "Meal planning support for service members and their families." },
  { icon: GraduationCap, title: "College Students", desc: "Eat well on a tight student budget." },
  
];

export function WhoWeHelpSection() {
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
            Who We Help
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Designed for households of all sizes and budgets.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {audiences.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group p-6 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border hover:border-primary/20"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
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
