import { Check } from "lucide-react";

interface MultiChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function MultiChip({ label, selected, onClick }: MultiChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/30"
      }`}
    >
      {selected && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
