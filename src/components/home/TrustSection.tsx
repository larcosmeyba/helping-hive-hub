import { motion } from "framer-motion";
import { ShieldCheck, Lock, Gift, Building2 } from "lucide-react";

const trustItems = [
  {
    icon: Lock,
    title: "Privacy First",
    desc: "We never sell your data. We never share your SNAP or WIC status with retailers or advertisers. Your information stays yours.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent Pricing",
    desc: "Every price is an estimate, clearly labeled so you know what to expect. Actual store prices may vary — we tell you when and why.",
  },
  {
    icon: Gift,
    title: "Free Forever for SNAP Families",
    desc: "If your household receives SNAP or WIC benefits, Help The Hive is free. No trial, no credit card, no catch.",
  },
  {
    icon: Building2,
    title: "Your Store, Your Choice",
    desc: "We partner with retailers to bring you better tools — but you choose which store fits your family. Help The Hive is independent and not affiliated with any government agency.",
  },
];

export function TrustSection() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-accent/10 text-accent">
            Trust & Transparency
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built with trust at the core
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            We believe in transparency. Here's how we handle your data and what you can expect.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {trustItems.map((item, i) => {
            const isSnap = item.title === "Free Forever for SNAP Families";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-6 rounded-2xl bg-card border border-border"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSnap ? "bg-primary/15" : "bg-accent/10"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isSnap ? "text-primary" : "text-accent"}`} />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
