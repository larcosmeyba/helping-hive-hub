import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-transparent.png";

export default function NativeAuth() {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/favicon.png" alt="Loading" className="h-10 w-10 animate-float" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password.length < 10) {
      toast({ title: "Error", description: "Password must be at least 10 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        // Don't navigate manually — the `if (user) Navigate` guard above will
        // redirect once the auth state propagates. Navigating before state
        // settles can cause ProtectedRoute to bounce back to /auth.
      } else {
        await signUp(email, password, displayName);
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <img src={logo} alt="Help The Hive" className="w-[68px] h-[68px] mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Help <span className="text-gradient-honey">The Hive</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {mode === "login" ? "Welcome back" : "Start planning smarter meals"}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-6">
          {/* Tab toggle */}
          <div className="flex rounded-xl bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90"
              disabled={loading}
            >
              {loading
                ? mode === "login" ? "Signing in..." : "Creating Account..."
                : mode === "login" ? "Sign In" : "Get Started"
              }
            </Button>

            {mode === "login" && (
              <div className="text-center">
                <a
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
