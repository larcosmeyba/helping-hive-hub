import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { isNativeApp } from "@/hooks/useIsNativeApp";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/favicon.png" alt="Loading" className="h-10 w-10 animate-float" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to={isNativeApp() ? "/auth" : "/login"} replace />;

  return <>{children}</>;
}
