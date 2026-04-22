import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { WhoWeHelpSection } from "@/components/home/WhoWeHelpSection";
import { MealPlanSection } from "@/components/home/MealPlanSection";
import { RecipeShowcase } from "@/components/home/RecipeShowcase";
import { WhyDifferentSection } from "@/components/home/WhyDifferentSection";
import { TrustSection } from "@/components/home/TrustSection";
import { FounderSection } from "@/components/home/FounderSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <WhoWeHelpSection />
        <MealPlanSection />
        <RecipeShowcase />
        <WhyDifferentSection />
        <TrustSection />
        <FounderSection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
