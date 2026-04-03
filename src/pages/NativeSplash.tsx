import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-transparent.png";

export default function NativeSplash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Hold the splash for a moment, then fade out and navigate
    const holdTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1600);

    const navTimer = setTimeout(() => {
      navigate(user ? "/dashboard" : "/auth", { replace: true });
    }, 2200);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(navTimer);
    };
  }, [loading, user, navigate]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 safe-area-top safe-area-bottom ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle warm glow behind logo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Logo + wordmark */}
      <div className="relative flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-700">
        <img
          src={logo}
          alt="Help The Hive"
          className="h-24 w-24 drop-shadow-lg"
        />
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
          Help <span className="text-gradient-honey">The Hive</span>
        </h1>
      </div>
    </div>
  );
}
