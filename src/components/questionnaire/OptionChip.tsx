import { Check } from "lucide-react";

interface OptionChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export function OptionChip({ label, selected, onClick, icon }: OptionChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-4 py-3.5 rounded-2xl border-2 text-left transition-all text-[15px] font-medium ${
        selected
          ? "bg-primary/10 border-primary text-foreground"
          : "bg-card border-border text-muted-foreground hover:border-primary/30"
      }`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="flex-1">{label}</span>
      {selected && (
        <Check className="w-5 h-5 text-primary shrink-0" />
      )}
    </button>
  );
}
