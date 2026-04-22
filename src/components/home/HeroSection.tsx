import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroFamily from "@/assets/hero-family.jpg";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Full-bleed family photo background */}
      <div className="absolute inset-0">
        <img
          src={heroFamily}
          alt="Real family planning a weekly grocery budget at home"
          className="w-full h-full object-cover"
          width={1920}
          height={960}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-hive-black/85 via-hive-black/70 to-hive-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-hive-black/60 via-transparent to-hive-black/30" />
        {/* Extra readability overlay (Fix 2.1) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-24 relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span
              className="inline-block px-5 py-3 mb-5 text-xs font-extrabold tracking-[0.15em] uppercase rounded-full bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm"
              style={{ boxShadow: "0 4px 12px rgba(232, 168, 32, 0.25)" }}
            >
              Free for SNAP & WIC families
            </span>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-honey-cream leading-[1.1] mb-4">
              Meals that fit your budget.{" "}
              <span className="text-gradient-honey">At the store you already shop at.</span>
            </h1>

            <p className="text-lg md:text-xl text-honey-cream/70 mb-10 max-w-xl leading-relaxed">
              Budget meal planning for real families. We plan your week of meals,
              build your grocery list, and help you cook with what's already in
              your kitchen — at the store you already shop at.
            </p>

            <div className="flex flex-col items-start gap-3">
              <Button variant="hero" size="lg" className="text-base px-8 h-12" asChild>
                <Link to="/signup">
                  Join the Waitlist <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 h-12 border-2 border-primary text-primary bg-transparent hover:bg-primary/10 hover:text-primary font-semibold"
                asChild
              >
                <a href="#meal-plan-examples">
                  View Sample Plans <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/60 to-transparent" />
    </section>
  );
}
