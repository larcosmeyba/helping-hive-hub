import { Button } from "@/components/ui/button";
import { Apple, Play } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export const APP_STORE_URL =
  "https://apps.apple.com/us/app/help-the-hive/id6761348448";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.helpthehive";

interface Props {
  source?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function DownloadAppButtons({ source, size = "lg", className }: Props) {
  const track = (store: "ios" | "android") => {
    try {
      trackEvent("download_app_click", { store, source });
    } catch {
      /* analytics is best-effort */
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className ?? ""}`}>
      <Button
        variant="hero"
        size={size}
        asChild
        className="text-base px-6 h-12"
      >
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("ios")}
          aria-label="Download Help The Hive on the App Store"
        >
          <Apple className="w-5 h-5 mr-2" />
          App Store
        </a>
      </Button>
      <Button
        variant="hero"
        size={size}
        asChild
        className="text-base px-6 h-12"
      >
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("android")}
          aria-label="Get Help The Hive on Google Play"
        >
          <Play className="w-5 h-5 mr-2" />
          Google Play
        </a>
      </Button>
    </div>
  );
}
