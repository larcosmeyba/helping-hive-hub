import { useParams, Link } from "react-router-dom";
import { getPageBySlug } from "./legalPagesData";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

function renderContent(text: string) {
  // Convert markdown-style links and email links
  const parts = text.split(/(\[.*?\]\(.*?\)|📧)/g);
  return parts.map((part, i) => {
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} className="text-primary hover:underline font-medium">
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? getPageBySlug(slug) : undefined;

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold mb-4">Page Not Found</h1>
            <Link to="/" className="text-primary hover:underline">Return Home</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Build jump links for long pages (Terms, Privacy)
  const jumpLinks = page.sections
    .filter(s => s.heading)
    .map(s => ({
      id: s.heading!.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: s.heading!
    }));

  const showJumpLinks = jumpLinks.length > 5;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-16 max-w-3xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{page.title}</span>
          </nav>

          {/* Title & Last Updated */}
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {page.title}
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-8">
            Last Updated: {page.lastUpdated}
          </div>

          {/* Jump Links */}
          {showJumpLinks && (
            <div className="mb-10 p-4 rounded-xl bg-card border border-border">
              <p className="text-sm font-semibold text-foreground mb-3">On this page</p>
              <ul className="space-y-1.5">
                {jumpLinks.map(link => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-8">
            {page.sections.map((section, idx) => {
              const sectionId = section.heading
                ? section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                : undefined;

              return (
                <section key={idx} id={sectionId}>
                  {section.heading && (
                    <h2 className="text-xl font-display font-semibold text-foreground mb-3">
                      {section.heading}
                    </h2>
                  )}
                  <div className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line">
                    {renderContent(section.content)}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Global disclaimer for relevant pages */}
          {(page.category === "legal" || page.category === "platform" || page.category === "programs") && (
            <>
              <Separator className="my-10" />
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Help the Hive provides planning and information tools only. The platform does not provide legal advice, financial advice, medical advice, dietetic treatment, or government benefit administration. Users are responsible for reviewing ingredients, dietary needs, pricing, store availability, and personal circumstances before making decisions.
              </p>
            </>
          )}

          {/* Contact block */}
          <Separator className="my-10" />
          <div className="rounded-xl bg-card border border-border p-6">
            <p className="font-display font-semibold text-foreground mb-2">
              Questions about this page?
            </p>
            <p className="text-sm text-muted-foreground">
              Contact:{" "}
              <a href="mailto:marcos@helpthehive.com" className="text-primary hover:underline">
                marcos@helpthehive.com
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              Support:{" "}
              <a href="mailto:marcos@helpthehive.com" className="text-primary hover:underline">
                marcos@helpthehive.com
              </a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
