import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-transparent.png";
import { CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRecovery) {
      toast({
        title: "Recovery link required",
        description:
          "Open this page from the password-reset email link. For security, passwords can only be changed through a fresh recovery link.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 10) {
      toast({ title: "Error", description: "Password must be at least 10 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src={logo} alt="Help The Hive" className="h-10 w-10" />
            <span className="font-display text-2xl font-bold text-foreground">
              Help <span className="text-gradient-honey">The Hive</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {success ? "Password Updated!" : "Set New Password"}
          </h1>
          <p className="text-muted-foreground">
            {success ? "Redirecting you to your dashboard..." : "Enter your new password below"}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-muted-foreground text-sm">
                Your password has been updated successfully. You'll be redirected shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={10}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={10}
                />
              </div>
              {!isRecovery && (
                <p className="text-xs text-muted-foreground text-center">
                  Waiting for a valid recovery link… If nothing happens, request a new
                  password-reset email and open it in this browser.
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90"
                disabled={loading || !isRecovery}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
