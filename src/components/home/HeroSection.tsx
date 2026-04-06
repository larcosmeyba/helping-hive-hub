import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroDevices from "@/assets/hero-devices.jpg";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hive-black">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/[0.06] rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 pt-20 md:pt-28 pb-16 md:pb-24 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/15 text-primary border border-primary/20">
              Now in Early Access
            </span>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-honey-cream leading-[1.1] mb-6">
              Plan meals that fit your{" "}
              <span className="text-gradient-honey">real grocery budget.</span>
            </h1>

            <p className="text-lg md:text-xl text-honey-cream/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              Help The Hive creates personalized meal plans, smart grocery lists,
              pantry-aware suggestions, and budget guidance — built for the way
              real households actually eat and shop.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="lg" className="text-base px-8 h-12" asChild>
                <Link to="/signup">
                  Get Early Access <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-honey-cream/70 hover:text-honey-cream hover:bg-honey-cream/5 text-base h-12"
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

        {/* Device mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <img
            src={heroDevices}
            alt="Help The Hive app showing meal planning, grocery lists, and budget tracking"
            className="w-full h-auto rounded-2xl"
            width={1920}
            height={1080}
          />
        </motion.div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
