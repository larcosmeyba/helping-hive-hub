import { motion } from "framer-motion";
import marcosPhoto from "@/assets/marcos-leyba.jpg";

export function FounderSection() {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10">
            Meet the Founder
          </h2>

          <div className="inline-flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden mb-6 shadow-soft border-4 border-primary/20">
              <img
                src={marcosPhoto}
                alt="Marcos Leyba, Founder & CEO of Help The Hive"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <h3 className="font-display text-2xl font-semibold text-foreground mb-2">Marcos Leyba</h3>
            <p className="text-sm text-primary font-medium mb-4">Founder & CEO</p>
            <p className="text-muted-foreground leading-relaxed max-w-xl">
              Marcos created Help The Hive to solve a real problem — helping families eat
              well without overspending. With a passion for technology and community impact,
              he's building a platform that makes smart meal planning accessible to everyone.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
