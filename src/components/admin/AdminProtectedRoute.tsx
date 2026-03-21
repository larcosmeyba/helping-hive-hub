import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Navigate } from "react-router-dom";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(0,0%,7%)]">
        <div className="flex flex-col items-center gap-3">
          <img src="/favicon.png" alt="Loading" className="h-10 w-10 animate-pulse" />
          <p className="text-[hsl(0,0%,65%)] text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
