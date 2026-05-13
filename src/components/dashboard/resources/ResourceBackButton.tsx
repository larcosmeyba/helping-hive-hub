import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  fallback?: string;
  label?: string;
}

export function ResourceBackButton({ fallback = "/dashboard/resources", label = "Back" }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate(fallback);
      }}
      className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors -ml-1"
      aria-label="Go back"
    >
      <ChevronLeft className="w-5 h-5" />
      {label}
    </button>
  );
}
