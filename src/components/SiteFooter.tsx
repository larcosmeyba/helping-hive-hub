import { Link } from "react-router-dom";
import { useState } from "react";
import { ChevronDown, Instagram } from "lucide-react";
import { footerColumns } from "@/pages/legal/legalPagesData";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo-transparent.png";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69A8.16 8.16 0 0 0 21.6 10.4V7a4.85 4.85 0 0 1-2.01-.31z" />
  </svg>
);

function FooterColumn({ title, links, isOpen, onToggle, isMobile }: {
  title: string;
  links: { label: string; slug?: string; to?: string }[];
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  if (isMobile) {
    return (
      <div className="border-b border-white/[0.08]">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full py-4 text-left"
        >
          <span className="text-sm font-semibold text-white/90">{title}</span>
          <ChevronDown className={`h-4 w-4 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <ul className="pb-4 space-y-2.5 pl-1">
            {links.map(link => (
              <li key={link.slug ?? link.to}>
                <Link
                  to={link.to ?? `/page/${link.slug}`}
                  className="text-[13px] text-white/50 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white/90 mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(link => (
          <li key={link.slug ?? link.to}>
            <Link
              to={link.to ?? `/page/${link.slug}`}
              className="text-[13px] text-white/50 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const isMobile = useIsMobile();
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const quickLinks = [
    { label: "Terms", slug: "terms" },
    { label: "Privacy", slug: "privacy" },
    { label: "Cookies", slug: "cookies" },
    { label: "Refunds", slug: "refunds" },
    { label: "Accessibility", slug: "accessibility" },
    { label: "Support", slug: "contact-support" },
    { label: "Contact", slug: "contact" },
  ];

  return (
    <footer style={{ backgroundColor: "#15181D" }} className="text-white">
      {/* Brand Summary */}
      <div className="container mx-auto px-4 pt-12 md:pt-16 pb-8 md:pb-10">
        <div className="flex items-start gap-3 mb-2">
          <img src={logo} alt="Help The Hive" className="h-8 w-8 brightness-0 invert" />
          <div>
            <h3 className="font-display text-lg font-bold">
              Help <span className="text-primary">The Hive</span>
            </h3>
          </div>
        </div>
        <p className="text-sm text-white/50 leading-relaxed max-w-lg ml-11 mb-3">
          Free meal planning for every family. Budget smarter on groceries — proudly supports SNAP/EBT families through our Instacart partnership.
        </p>
        <div className="ml-11">
          <p className="text-xs font-semibold text-white/60 mb-1.5">Contact</p>
          <ul className="space-y-1 text-xs text-white/40">
            <li>
              General:{" "}
              <a href="mailto:marcos@helpthehive.com" className="hover:text-white/80 transition-colors">
                marcos@helpthehive.com
              </a>
            </li>
            <li>
              Partnerships:{" "}
              <a href="mailto:marcos@helpthehive.com" className="hover:text-white/80 transition-colors">
                marcos@helpthehive.com
              </a>
            </li>
            <li>
              Press:{" "}
              <a href="mailto:marcos@helpthehive.com" className="hover:text-white/80 transition-colors">
                marcos@helpthehive.com
              </a>
            </li>
            <li>
              Support:{" "}
              <a href="mailto:marcos@helpthehive.com" className="hover:text-white/80 transition-colors">
                marcos@helpthehive.com
              </a>
            </li>
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-white/40">
            <Link to="/partners" className="hover:text-white/80 transition-colors underline underline-offset-2">
              Partners
            </Link>
            <Link to="/partnerships" className="hover:text-white/80 transition-colors underline underline-offset-2">
              Partnerships
            </Link>
            <Link to="/press" className="hover:text-white/80 transition-colors underline underline-offset-2">
              Press
            </Link>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <a
              href="https://www.instagram.com/helpthehive"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Help The Hive on Instagram"
              className="text-white/50 hover:text-primary transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://www.tiktok.com/@helpthehive"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Help The Hive on TikTok"
              className="text-white/50 hover:text-primary transition-colors"
            >
              <TikTokIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="border-t border-white/[0.08]" />
      </div>

      {/* Link Columns */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {isMobile ? (
          <div>
            {footerColumns.map(col => (
              <FooterColumn
                key={col.title}
                title={col.title}
                links={col.links}
                isMobile
                isOpen={openColumn === col.title}
                onToggle={() => setOpenColumn(openColumn === col.title ? null : col.title)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-8">
            {footerColumns.map(col => (
              <FooterColumn
                key={col.title}
                title={col.title}
                links={col.links}
                isMobile={false}
                isOpen={true}
                onToggle={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="border-t border-white/[0.08]" />
      </div>

      {/* Disclaimer */}
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-[11px] text-white/40 leading-relaxed max-w-3xl mx-auto mb-4">
          Grocery checkout powered by Instacart. Help The Hive is an independent service and is not owned or operated by Instacart.
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Help the Hive. All rights reserved.
          </p>
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary tracking-wide uppercase">
            Patent Pending
          </span>
        </div>
        <p className="text-center text-[11px] text-white/20 leading-relaxed max-w-3xl mx-auto mb-3">
          Help the Hive provides meal planning, grocery budgeting, pantry management, and food planning tools designed to help households make informed decisions. Grocery prices, availability, store inventory, and promotional pricing may vary by location, retailer, and time.
        </p>
        <p className="text-center text-[11px] text-white/20 leading-relaxed max-w-3xl mx-auto">
          Help the Hive is not affiliated with, endorsed by, or operated by any government agency unless explicitly stated on a specific program page.
        </p>
      </div>

      {/* Quick Links Bar */}
      <div className="border-t border-white/[0.08]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {quickLinks.map(link => (
              <Link
                key={link.slug}
                to={`/page/${link.slug}`}
                className="text-[11px] text-white/35 hover:text-white/70 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
