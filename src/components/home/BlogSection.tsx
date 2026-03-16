import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

const posts = [
  { title: "5 Tips for Budget Cooking", desc: "Simple strategies to cut grocery costs without sacrificing flavor.", tag: "Budget" },
  { title: "Reducing Food Waste at Home", desc: "How to use what you have and waste less every week.", tag: "Sustainability" },
  { title: "Meal Planning 101", desc: "A beginner's guide to planning meals for the whole week.", tag: "Planning" },
  { title: "Nutrition on a Budget", desc: "Eating healthy doesn't have to be expensive.", tag: "Nutrition" },
];

export function BlogSection() {
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
            Learn & Save
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tips, guides, and insights for smarter grocery shopping and meal planning.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {posts.map((post, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card shadow-card border border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-semibold text-primary">{post.tag}</span>
              <h3 className="font-display text-base font-semibold text-foreground mt-1 mb-2">{post.title}</h3>
              <p className="text-sm text-muted-foreground">{post.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
