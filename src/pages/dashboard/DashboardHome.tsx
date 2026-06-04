import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import bowlImg from "@/assets/home-bowl.png";
import basketImg from "@/assets/home-basket.png";
import fridgeImg from "@/assets/home-fridge.png";
import produceBoxImg from "@/assets/home-produce-box.png";
import apolloLogo from "@/assets/apollo-logo.png.asset.json";
import apolloMarcos from "@/assets/apollo-marcos.png.asset.json";

export default function DashboardHome() {
  const { profile } = useAuth();
  const { mealPlan } = useMealPlan();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.questionnaire_completed === false) {
      navigate("/questionnaire", { replace: true });
    }
  }, [profile?.questionnaire_completed, navigate, profile]);

  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const budget = profile?.weekly_budget ?? 75;
  const groceryCount = 12; // TODO: wire to grocery list

  return (
    <div className="w-full max-w-3xl mx-auto -mx-4 px-4 pb-6 min-h-full">
      {/* Greeting */}
      <div className="pt-2 pb-1">
        <h1 className="text-[22px] font-extrabold text-[#1a1a1a] leading-tight">
          {greeting}, {firstName} <span aria-hidden>☀️</span>
        </h1>
        <p className="text-[13px] text-[#6b6b6b] mt-1">
          Let's save money, eat better, and feel your best.
        </p>
      </div>

      {/* Section heading */}
      <h2 className="text-[15px] font-bold text-[#1a1a1a] mt-5 mb-3">
        What would you like to do today?
      </h2>

      {/* Three primary action cards */}
      <div className="space-y-3">
        <ActionCard
          bg="#E85D2F"
          title="Generate This Week's Meal Plan"
          subtitle={`Custom plan for your $${budget} budget`}
          image={bowlImg}
          onClick={() => navigate("/dashboard/meal-plan/setup")}
        />
        <ActionCard
          bg="#4A8F3D"
          title="Shop Your Grocery List"
          subtitle={`${groceryCount} items ready to shop`}
          image={basketImg}
          onClick={() => navigate("/dashboard/grocery-list")}
        />
        <ActionCard
          bg="#5B3FBF"
          title="Cook From What I Have"
          subtitle="Use your fridge & pantry first"
          image={fridgeImg}
          onClick={() => navigate("/dashboard/cook")}
        />
      </div>

      {/* Hive Assistant */}
      <div className="mt-4 rounded-2xl p-4 bg-[#F5EBDC] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#1a1a1a]" />
          <span className="font-bold text-[15px] text-[#1a1a1a]">Hive Assistant</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#9CB87A] text-white">AI</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#3a3a3a] leading-snug mb-3 max-w-[200px]">
              You have spinach, eggs, and chicken that may go bad soon. I can build meals to use these first and save you about $8 this week.
            </p>
            <button
              onClick={() => navigate("/dashboard/fridge-chef")}
              className="bg-[#1F5A3D] text-white text-[13px] font-semibold px-4 py-2 rounded-lg"
            >
              Use These Items First
            </button>
          </div>
          <img src={produceBoxImg} alt="" loading="lazy" className="w-24 h-24 object-contain shrink-0" />
        </div>
      </div>

      {/* Hive Family Assistance */}
      <div className="mt-3 rounded-2xl p-4 bg-[#FCE7EC] flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 fill-[#E63B6B] text-[#E63B6B]" />
            <span className="font-bold text-[15px] text-[#1a1a1a]">Hive Family Assistance</span>
          </div>
          <p className="text-[13px] text-[#4a4a4a] leading-snug">
            Get help with food, housing, bills, childcare, healthcare, and more.
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard/resources")}
          className="bg-[#E63B6B] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shrink-0"
        >
          Find Help
        </button>
      </div>

      {/* Apollo Reborn */}
      <div className="mt-3 rounded-2xl p-4 bg-white border border-[#EEE7DA] flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <img src={apolloLogo.url} alt="Apollo Reborn" className="w-4 h-4 object-contain" />
            <span className="font-bold text-[15px] text-[#1a1a1a]">Move With Your Meal Plan</span>
          </div>
          <p className="text-[12px] font-semibold text-[#5B3FBF] mb-1">Powered by Apollo Reborn</p>
          <p className="text-[12px] text-[#4a4a4a] mb-3">
            Recommended: 20-Minute Beginner Workout
          </p>
          <a
            href={
              /iPad|iPhone|iPod/.test(navigator.userAgent)
                ? "https://apps.apple.com/us/app/apollo-reborn/id6761779680"
                : "https://play.google.com/store/apps/details?id=com.apollonation.app"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#5B3FBF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg"
          >
            Download Apollo Reborn
          </a>
        </div>
        <img src={apolloMarcos.url} alt="" loading="lazy" className="w-24 h-28 object-contain shrink-0" />
      </div>
    </div>
  );
}

function ActionCard({
  bg,
  title,
  subtitle,
  image,
  onClick,
}: {
  bg: string;
  title: string;
  subtitle: string;
  image: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden active:scale-[0.99] transition-transform"
      style={{ backgroundColor: bg }}
    >
      <div className="flex-1 min-w-0 pr-1">
        <h3 className="text-white font-bold text-[16px] leading-tight">{title}</h3>
        <p className="text-white text-[12.5px] mt-1 leading-snug">{subtitle}</p>
      </div>
      <img src={image} alt="" loading="lazy" className="w-20 h-20 object-contain shrink-0" />
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
        <ArrowRight className="w-4 h-4 text-[#1a1a1a]" />
      </div>
    </button>
  );
}
