import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";

export default function Press() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Press & Media — Help The Hive"
        description="Press resources, media inquiries, and quick facts about Help The Hive — free meal planning and grocery lists for every family."
        canonical="https://helpthehive.com/press"
      />
      <Navbar />
      <main id="main-content" className="flex-1">
        <section className="bg-honey-50 border-b border-border">
          <div className="container mx-auto px-4 py-16 md:py-24 max-w-3xl text-center">
            <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/15 text-primary">
              Press & Media
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Telling the Help The Hive story.
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We work with journalists, podcasters, and creators covering family budgets, food
              access, and SNAP/WIC.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16 max-w-3xl space-y-10">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Brand assets
            </h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Logos, color palette, and product screenshots — for editorial use only.
            </p>
            <Button variant="outline" disabled>
              Press kit coming soon
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Media inquiries
            </h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Working on a story? Use our partnerships form and select "Press / Media" — we read
              every message personally.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/partnerships?type=press">Submit press inquiry</Link>
              </Button>
              <Button asChild variant="outline">
                <a href="mailto:marcos@helpthehive.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Email directly
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Quick facts
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
              <li>
                Help The Hive is a budget meal planning service built for families on fixed
                grocery budgets.
              </li>
              <li>The product is free for SNAP and WIC eligible households.</li>
              <li>Grocery checkout is powered by Instacart for delivery and pickup.</li>
              <li>Founded by Marcos Leyba.</li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
