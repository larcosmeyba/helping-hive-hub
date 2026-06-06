import { motion } from "framer-motion";
import { Tag, ShoppingBag, Heart, ShieldCheck, Check } from "lucide-react";

const features = [
  {
    icon: Tag,
    title: "Stay On Budget",
    desc: "Build meal plans around your grocery budget and stick to it. No more overspending.",
  },
  {
    icon: ShoppingBag,
    title: "Use What You Have",
    desc: "Our AI helps you use pantry items first — reducing waste and saving money.",
  },
  {
    icon: Heart,
    title: "Get Help When You Need It",
    desc: "Find local food assistance resources and support for your family.",
  },
  {
    icon: ShieldCheck,
    title: "Your Data. Your Privacy.",
    desc: "We never sell your data. Your information is always kept private and secure.",
  },
];

const trustBadges = [
  "Powered by Instacart",
  "Grocery Delivery Partner",
  "EBT Supported At Participating Retailers",
  "Available At Stores In Your Area",
];

export function FeaturesSection() {
  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 mb-10 md:mb-14">
          {features.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-border flex items-center justify-center mb-4 shadow-sm">
                <item.icon className="w-5 h-5 text-[#1F5A2C]" />
              </div>
              <h3 className="font-display text-lg font-bold text-charcoal mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Instacart trust banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl bg-[#E6F4E6] px-5 md:px-8 py-3 md:py-4 flex flex-wrap items-center gap-x-6 gap-y-2 justify-center"
        >
          {trustBadges.map((text) => (
            <div key={text} className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#1F5A2C] shrink-0" />
              <span className="text-sm font-medium text-[#1F5A2C]">{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
