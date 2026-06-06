import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { SEOHead } from "@/components/SEOHead";
import { OrganizationSchema, WebSiteSchema } from "@/components/StructuredData";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { WhoWeHelpSection } from "@/components/home/WhoWeHelpSection";
import { MealPlanSection } from "@/components/home/MealPlanSection";
import { BudgetResultsSection } from "@/components/home/RecipeShowcase";
import { WhyDifferentSection } from "@/components/home/WhyDifferentSection";
import { TrustSection } from "@/components/home/TrustSection";

import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Help The Hive — Free Meal Planning & Grocery Lists for Every Family"
        description="Free forever meal plans and grocery lists that fit your budget — at the store you already shop at. No subscription, no paywall. Plan your week in under 5 minutes."
        canonical="https://helpthehive.com/"
      />
      <OrganizationSchema />
      <WebSiteSchema />
      <Navbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <WhoWeHelpSection />
        <MealPlanSection />
        <BudgetResultsSection />
        <WhyDifferentSection />
        <TrustSection />
        
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
