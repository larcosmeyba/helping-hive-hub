import { MapPin, Camera, Shield } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PermissionModalProps {
  open: boolean;
  type: "location" | "camera";
  onContinue: () => void;
  onDismiss: () => void;
}

const CONFIG = {
  location: {
    icon: MapPin,
    title: "Enable Location",
    description:
      "Help the Hive uses your location to personalize grocery pricing, show nearby store options, and improve meal planning recommendations for your area.",
    continueLabel: "Continue",
    dismissLabel: "Not Now",
    privacyNote: "We only use approximate location for store and pricing relevance. Your exact location is never stored or shared.",
  },
  camera: {
    icon: Camera,
    title: "Enable Camera",
    description:
      "Help the Hive uses your camera so you can scan fridge and pantry items, upload food photos, and build more accurate meal plans.",
    continueLabel: "Continue",
    dismissLabel: "Not Now",
    privacyNote: "Photos are processed securely and are never stored or shared without your permission.",
  },
};

export function PermissionModal({ open, type, onContinue, onDismiss }: PermissionModalProps) {
  const config = CONFIG[type];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden border-0">
        {/* Header accent */}
        <div className="bg-gradient-honey px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-primary-foreground">{config.title}</h2>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>

          <div className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">{config.privacyNote}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={onContinue}
              className="w-full h-12 bg-gradient-honey text-primary-foreground hover:opacity-90 font-semibold rounded-xl"
            >
              {config.continueLabel}
            </Button>
            <Button
              variant="ghost"
              onClick={onDismiss}
              className="w-full h-10 text-muted-foreground hover:text-foreground text-sm"
            >
              {config.dismissLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
