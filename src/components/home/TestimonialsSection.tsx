import { Quote } from "lucide-react";

interface Testimonial {
  name: string;
  city: string;
  household: string;
  quote: string;
}

// PLACEHOLDER — replace with real customer testimonials before launch.
// Words + first name + city + household size only. No photos to avoid any
// AI-generated-people perception (per project marketing-tone rule).
const TESTIMONIALS: Testimonial[] = [
  {
    name: "Maria",
    city: "Phoenix, AZ",
    household: "Family of 4",
    quote:
      "Sunday meal planning used to take me an hour. Now it takes 5 minutes and I actually stick to my budget.",
  },
  {
    name: "Jasmine",
    city: "Atlanta, GA",
    household: "Family of 3",
    quote:
      "Being able to send my whole grocery list to Instacart in one tap saves me so much time on busy weeks.",
  },
  {
    name: "David",
    city: "San Antonio, TX",
    household: "Family of 5",
    quote:
      "It plans around what's already in my pantry. We waste way less food than we used to.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 px-4 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
            From real families
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Built for the way families actually shop.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-background rounded-2xl border border-border p-6 flex flex-col shadow-card"
            >
              <Quote className="w-6 h-6 text-primary mb-3" />
              <p className="text-sm leading-relaxed text-foreground/80 mb-4 flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="font-semibold text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.city} · {t.household}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
