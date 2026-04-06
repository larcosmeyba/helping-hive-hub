import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroFamily from "@/assets/hero-family.jpg";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Full-bleed family photo background */}
      <div className="absolute inset-0">
        <img
          src={heroFamily}
          alt="A family enjoying a home-cooked meal together"
          className="w-full h-full object-cover"
          width={1920}
          height={960}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-hive-black/85 via-hive-black/70 to-hive-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-hive-black/60 via-transparent to-hive-black/30" />
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm">
              Now in Early Access
            </span>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-honey-cream leading-[1.1] mb-6">
              Affordable Meal Planning for{" "}
              <span className="text-gradient-honey">Real Families</span>
            </h1>

            <p className="text-lg md:text-xl text-honey-cream/70 mb-10 max-w-xl leading-relaxed">
              Help The Hive creates personalized meal plans, smart grocery lists,
              pantry-aware suggestions, and budget guidance — built for the way
              real households actually eat and shop.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Button variant="hero" size="lg" className="text-base px-8 h-12" asChild>
                <Link to="/signup">
                  Get Early Access <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-honey-cream/70 hover:text-honey-cream hover:bg-honey-cream/10 text-base h-12 backdrop-blur-sm"
                asChild
              >
                <a href="#how-it-works">
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  See How It Works
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
