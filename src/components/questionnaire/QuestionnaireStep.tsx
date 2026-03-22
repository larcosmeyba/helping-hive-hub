import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface QuestionnaireStepProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  optional?: boolean;
  onSkip?: () => void;
}

export function QuestionnaireStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = "Continue",
  nextDisabled = false,
  loading = false,
  optional = false,
  onSkip,
}: QuestionnaireStepProps) {
  const progress = ((step) / totalSteps) * 100;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bg-background">
      {/* Header */}
      <div className="px-5 pt-safe-top">
        <div className="flex items-center justify-between py-4">
          {onBack ? (
            <button onClick={onBack} className="p-1 -ml-1 text-muted-foreground">
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-6" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            Step {step} of {totalSteps}
          </span>
          {optional && onSkip ? (
            <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
              Skip
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>
        )}
        <div className="flex-1">{children}</div>
      </div>

      {/* Bottom action */}
      <div className="px-5 pb-safe-bottom pb-6">
        <Button
          onClick={onNext}
          disabled={nextDisabled || loading}
          className="w-full h-14 text-base font-semibold rounded-2xl bg-primary text-primary-foreground shadow-lg"
        >
          {loading ? "Setting up..." : nextLabel}
        </Button>
      </div>
    </div>
  );
}
