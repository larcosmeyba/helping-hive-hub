import { Bell, Shield } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PushPermissionModalProps {
  open: boolean;
  onContinue: () => void;
  onDismiss: () => void;
}

/**
 * Pre-permission primer shown BEFORE invoking the native push permission prompt.
 * Mirrors PermissionModal styling for location/camera.
 */
export function PushPermissionModal({ open, onContinue, onDismiss }: PushPermissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden border-0">
        <div className="bg-gradient-honey px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-primary-foreground">
            Stay in the Loop
          </h2>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Help the Hive sends reminders for your meal plan, SNAP deposit alerts, and new-feature
            updates. You can turn any of these off in Settings.
          </p>

          <div className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              We never send marketing spam. You're in control of every category.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={onContinue}
              className="w-full h-12 bg-gradient-honey text-primary-foreground hover:opacity-90 font-semibold rounded-xl"
            >
              Continue
            </Button>
            <Button
              variant="ghost"
              onClick={onDismiss}
              className="w-full h-10 text-muted-foreground hover:text-foreground text-sm"
            >
              Not Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
