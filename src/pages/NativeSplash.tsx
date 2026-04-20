import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import logo from "@/assets/logo-transparent.png";

export default function NativeSplash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  // Pull display name straight from the auth session metadata — no extra DB call
  const displayName: string | null =
    user?.user_metadata?.display_name?.split(" ")[0] ?? null;

  useEffect(() => {
    if (loading) return;

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-600 safe-area-top safe-area-bottom ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#F2B233" }}
    >
      {/* Logo + welcome */}
      <div className="relative flex flex-col items-center">
        <motion.img
          src={logo}
          alt="Help The Hive"
          className="h-60 w-60"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />

        {user && displayName && (
          <motion.p
            className="mt-7 text-xl font-normal"
            style={{ color: "#1A1A1A" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          >
            Welcome back, {displayName}
          </motion.p>
        )}
      </div>
    </div>
  );
}
