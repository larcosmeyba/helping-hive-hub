import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-transparent.png";

export default function NativeSplash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    // Fetch display name for returning users
    if (user) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.display_name) {
            setDisplayName(data.display_name.split(" ")[0]); // First name only
          }
        });
    }

    const holdTimer = setTimeout(() => setFadeOut(true), 2000);
    const navTimer = setTimeout(() => {
      navigate(user ? "/dashboard" : "/auth", { replace: true });
    }, 2600);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(navTimer);
    };
  }, [loading, user, navigate]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-600 safe-area-top safe-area-bottom ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Warm glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      {/* Logo + wordmark + welcome */}
      <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
        <img
          src={logo}
          alt="Help The Hive"
          className="h-36 w-36 drop-shadow-lg"
        />
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
          Help <span className="text-gradient-honey">The Hive</span>
        </h1>
        {user && displayName && (
          <p className="text-lg text-muted-foreground font-medium animate-in fade-in duration-500 delay-300">
            Welcome Back, {displayName}
          </p>
        )}
      </div>
    </div>
  );
}
