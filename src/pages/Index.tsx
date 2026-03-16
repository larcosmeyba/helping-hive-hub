import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { MissionSection } from "@/components/home/MissionSection";
import { WhoWeHelpSection } from "@/components/home/WhoWeHelpSection";
import { MealPlanSection } from "@/components/home/MealPlanSection";
import { RecipeShowcase } from "@/components/home/RecipeShowcase";
import { FounderSection } from "@/components/home/FounderSection";
import { BlogSection } from "@/components/home/BlogSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <MissionSection />
        <WhoWeHelpSection />
        <MealPlanSection />
        <RecipeShowcase />
        <FounderSection />
        <BlogSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
