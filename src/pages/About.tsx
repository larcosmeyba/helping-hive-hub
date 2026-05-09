import { motion } from "framer-motion";
import { Heart, Eye, Target, Leaf, Apple, DollarSign } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import marcosPhoto from "@/assets/marcos-leyba.jpg";

const goals = [
  {
    icon: DollarSign,
    title: "Help families save money",
    body: "Plan meals around real budgets — not idealized grocery lists. Every plan respects what you can actually spend.",
  },
  {
    icon: Apple,
    title: "Eat well on a budget",
    body: "Affordable does not mean processed. Whole-food meals, balanced macros, and recipes you actually want to cook.",
  },
  {
    icon: Leaf,
    title: "Cut household food waste",
    body: "Smarter quantities, pantry-aware planning, and 6-day batch cooking that uses what you bought.",
  },
  {
    icon: Heart,
    title: "Treat food as health",
    body: "Nutrition is not a luxury. We build plans that support real bodies and real families — at any budget.",
  },
];

const wasteStats = [
  {
    stat: "30–40%",
    label: "of the U.S. food supply is wasted each year.",
    source: "USDA",
    href: "https://www.usda.gov/about-food/food-safety/food-loss-and-waste",
  },
  {
    stat: "~$408B",
    label: "in food is thrown away annually in the United States.",
    source: "ReFED / USDA",
    href: "https://refed.org/food-waste/the-problem/",
  },
  {
    stat: "~$1,500",
    label: "the average American family of four loses to food waste every year.",
    source: "EPA",
    href: "https://www.epa.gov/sustainable-management-food/sustainable-management-food-basics",
  },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="About Help The Hive — Mission, Vision & Founder Story"
        description="Our mission is to help every family save money, eat well, and waste less food. Meet the founder and learn what drives Help The Hive."
        canonical="https://helpthehive.com/about"
      />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-card py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm font-semibold text-primary tracking-wide uppercase mb-3">
                About Help The Hive
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-5">
                Dignity at the grocery store, for every family.
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                We're building the budget meal planning platform American families
                deserve — free, honest, and built around the way real households
                actually shop and cook.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission + Vision */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To help every family in America eat well on the budget they actually have —
                by turning grocery planning into something simple, dignified, and honest.
                No paywalls. No upsells. Free forever for the households that need it most.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                A country where no family has to choose between a full fridge and a paid
                rent check — where smart meal planning, healthy eating, and food-waste
                reduction are available to everyone, not just households who can afford
                premium apps.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Goals */}
        <section className="py-16 md:py-20 bg-card">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <div className="inline-flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Our Goals</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Four commitments that shape every feature we build.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {goals.map((g, i) => (
                <motion.div
                  key={g.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-background border border-border rounded-xl p-6"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <g.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{g.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{g.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Food waste data */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                The food-waste problem we're built to fight
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Food waste isn't a budget problem alone — it's a national one.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {wasteStats.map((s, i) => (
                <motion.div
                  key={s.stat}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-6 text-center"
                >
                  <div className="font-display text-4xl font-bold text-primary mb-3">{s.stat}</div>
                  <p className="text-sm text-foreground leading-relaxed mb-3">{s.label}</p>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
                  >
                    Source: {s.source}
                  </a>
                </motion.div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-8 max-w-2xl mx-auto">
              Sources: USDA Food Loss & Waste, EPA Sustainable Management of Food, ReFED. Figures are rounded national estimates.
            </p>
          </div>
        </section>

        {/* Founder */}
        <section className="py-16 md:py-20 bg-card">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10">
                Founder Story
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
                <div className="text-muted-foreground leading-relaxed max-w-xl space-y-4 text-left">
                  <p>
                    Marcos is the Founder and CEO of Help The Hive. He built the platform
                    after watching too many families — including his own at times — forced
                    to choose between a full fridge and a paid rent check.
                  </p>
                  <p>
                    Today's budget meal planning tools are either expensive, clinical, or
                    not actually free. Help The Hive is the product he wishes his family had:
                    smarter grocery planning, built around real budgets, at the store you
                    already shop at — and free for SNAP and WIC households.
                  </p>
                  <p className="font-medium text-foreground">
                    Every American family deserves dignity at the grocery store.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Want to help us scale this mission?
            </h2>
            <p className="text-muted-foreground mb-8">
              We work with retailers, nonprofits, government programs, and brands that share our values.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/partnerships">Partner with us</Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <a href="mailto:marcos@helpthehive.com">Contact the founder</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
