import { Link } from "react-router-dom";
import logo from "@/assets/logo-transparent.png";

export function Footer() {
  return (
    <footer className="bg-hive-black text-honey-cream">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Help The Hive" className="h-9 w-9 brightness-0 invert" />
              <span className="font-display text-xl font-bold">
                Help <span className="text-honey-gold">The Hive</span>
              </span>
            </div>
            <p className="text-sm text-honey-cream/60 leading-relaxed">
              Affordable meal planning for real families. Smart grocery optimization powered by real data.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-honey-gold">Get Started</h4>
            <ul className="space-y-2 text-sm text-honey-cream/60">
              <li><Link to="/signup" className="hover:text-honey-cream transition-colors">Sign Up Free</Link></li>
              <li><Link to="/login" className="hover:text-honey-cream transition-colors">Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-honey-gold">Sample Plans</h4>
            <ul className="space-y-2 text-sm text-honey-cream/60">
              <li><a href="/#meal-plan-examples" className="hover:text-honey-cream transition-colors">Free Meal Plan Examples</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-honey-cream/10 text-center text-sm text-honey-cream/40">
          © {new Date().getFullYear()} Help The Hive. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
