import { motion } from "framer-motion";
import { DownloadAppButtons } from "@/components/DownloadAppButtons";

export function CTASection() {
  return (
    <section className="py-12 md:py-16 bg-hive-black relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-honey-cream mb-6 leading-tight">
            Start Saving On Groceries Today
          </h2>
          <p className="text-honey-cream/60 text-lg mb-10 leading-relaxed">
            Build meal plans, manage your pantry, and shop smarter at Kroger.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <DownloadAppButtons source="cta-section" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
