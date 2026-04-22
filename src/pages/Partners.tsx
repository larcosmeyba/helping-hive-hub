import { motion } from "framer-motion";
import { Store, HeartHandshake, Sparkles, ArrowRight, Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const sections = [
  {
    icon: Store,
    eyebrow: "For Grocery Retailers",
    heading: "Bring high-intent shoppers into your stores",
    body: "Help The Hive drives high-intent, SNAP-and-budget-conscious users to your stores. Our users arrive with pre-planned meals, larger baskets, and higher trip frequency. Partner with us to feature your store in meal plans, share weekly promotions, and access pre-shopping demand.",
    bullets: [
      "Featured store placement for users who select you",
      "Co-marketing around SNAP and budget-friendly initiatives",
      "Aggregated insights on meal planning behavior",
      "Retail media integration",
    ],
    cta: { label: "Contact our partnerships team", email: "partnerships@helpthehive.com" },
  },
  {
    icon: HeartHandshake,
    eyebrow: "For Food Banks & SNAP Enrollment Partners",
    heading: "Free meal planning for the families you serve",
    body: "Help The Hive partners with food banks, SNAP-Ed agencies, and community health organizations to provide free meal planning tools for the families they serve. We offer white-label access, outcome reporting, and co-branded launch support.",
    bullets: [
      "White-label access for your community",
      "Aggregated outcome reporting (anonymized)",
      "Co-branded launch and onboarding support",
      "Free forever for SNAP & WIC households",
    ],
    cta: { label: "Start a community pilot", email: "community@helpthehive.com" },
  },
  {
    icon: Sparkles,
    eyebrow: "For Foundations & Funders",
    heading: "Non-dilutive capital that keeps the platform free",
    body: "Help The Hive is pursuing non-dilutive capital to keep our core experience free for SNAP families forever. We share anonymized aggregate outcome data with funders and partners.",
    bullets: [
      "Anonymized aggregate impact reporting",
      "Direct line to founder for diligence",
      "Quarterly progress updates",
      "Mission-aligned restricted grant support",
    ],
    cta: { label: "Request our impact deck", email: "grants@helpthehive.com" },
  },
];

export default function Partners() {
  useEffect(() => {
    document.title = "Partner with Help The Hive — Retailers, Community Orgs, Funders";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Grocery infrastructure for the families America hasn't built for. Partner with Help The Hive as a retailer, community organization, or funder.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative bg-card border-b border-border">
          <div className="container mx-auto px-4 py-16 md:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-3 py-1 mb-5 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
                Partnerships
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-[1.1]">
                Partner with{" "}
                <span className="text-gradient-honey">Help The Hive</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Grocery infrastructure for the families America hasn't built for.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sections */}
        <div className="container mx-auto px-4 py-16 md:py-20 space-y-16 md:space-y-24 max-w-5xl">
          {sections.map((s, i) => (
            <motion.section
              key={s.eyebrow}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-start"
              aria-labelledby={`partner-section-${i}`}
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-7 h-7 md:w-8 md:h-8 text-primary" aria-hidden="true" />
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-primary mb-2">
                  {s.eyebrow}
                </p>
                <h2
                  id={`partner-section-${i}`}
                  className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight"
                >
                  {s.heading}
                </h2>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-5">
                  {s.body}
                </p>
                <ul className="space-y-2 mb-7">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm md:text-base text-muted-foreground">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="hero" size="lg" asChild>
                  <a href={`mailto:${s.cta.email}`} aria-label={`${s.cta.label} via email`}>
                    <Mail className="w-4 h-4 mr-1" aria-hidden="true" />
                    {s.cta.label}
                    <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </motion.section>
          ))}
        </div>

        {/* Closing CTA */}
        <section className="bg-card border-t border-border">
          <div className="container mx-auto px-4 py-14 md:py-20 text-center max-w-2xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              Not sure which path fits?
            </h2>
            <p className="text-muted-foreground text-base md:text-lg mb-7">
              Send a note directly to our founder. We read every message.
            </p>
            <Button variant="heroOutline" size="lg" asChild>
              <a href="mailto:marcos@helpthehive.com" aria-label="Email Marcos at Help The Hive">
                <Mail className="w-4 h-4 mr-1" aria-hidden="true" />
                marcos@helpthehive.com
              </a>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
