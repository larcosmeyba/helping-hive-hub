import { motion } from "framer-motion";
import marcosPhoto from "@/assets/marcos-leyba.jpg";

export function FounderSection() {
  return (
    <section className="py-12 md:py-16 bg-card">
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
              Marcos is the Founder and CEO of Help The Hive. He built the platform after
              watching too many families — including his own at times — forced to choose
              between a full fridge and a paid rent check. Today's budget meal planning
              tools are either expensive, clinical, or not actually free. Help The Hive is
              the product he wishes his family had: smarter grocery planning, built around
              real budgets, at the store you already shop at — and free forever for SNAP
              and WIC households. Every American family deserves dignity at the grocery store.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
