import { MapPin, Camera, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PermissionDeniedBannerProps {
  type: "location" | "camera";
  onFallback?: () => void;
}

export function PermissionDeniedBanner({ type, onFallback }: PermissionDeniedBannerProps) {
  const openSettings = () => {
    // On native, this would open device settings. On web, guide user.
    window.open("app-settings:", "_blank");
  };

  if (type === "location") {
    return (
      <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Location Not Enabled</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You can still use Help the Hive by entering your ZIP code manually for store pricing and grocery estimates.
        </p>
        <div className="flex gap-2">
          {onFallback && (
            <Button variant="outline" size="sm" onClick={onFallback} className="text-xs h-8">
              Enter ZIP Code
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={openSettings} className="text-xs h-8 text-muted-foreground">
            <ExternalLink className="w-3 h-3 mr-1" /> Open Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Camera Not Enabled</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        You can still add items by choosing a photo from your gallery or entering ingredients manually.
      </p>
      <Button variant="ghost" size="sm" onClick={openSettings} className="text-xs h-8 text-muted-foreground">
        <ExternalLink className="w-3 h-3 mr-1" /> Open Settings
      </Button>
    </div>
  );
}
