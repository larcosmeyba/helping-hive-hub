import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useKrogerConnection } from "@/hooks/useKrogerConnection";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user opts to continue WITHOUT Kroger. */
  onContinueWithout: () => void;
  /** Where to send the user after Kroger OAuth completes (defaults to current path). */
  redirectAfter?: string;
}

/**
 * Shown before meal-plan generation if the user has not yet connected Kroger.
 * Strongly encourages connecting for accurate pricing, but lets users continue
 * with reduced-accuracy estimates.
 */
export function KrogerRequiredDialog({ open, onOpenChange, onContinueWithout, redirectAfter }: Props) {
  const { connect } = useKrogerConnection();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-[hsl(43_100%_96%)]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#F2B233]/20 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-[#F2A900]" />
          </div>
          <DialogTitle className="text-center text-[18px] font-extrabold text-[#1a1a1a]">
            Connect Your Kroger Account
          </DialogTitle>
          <DialogDescription className="text-center text-[13px] text-[#6b6b6b] leading-relaxed pt-1">
            Help The Hive uses live Kroger pricing to build meal plans that fit your exact grocery budget.
            Connect your Kroger account and select your home store so we can create the most accurate meal plan possible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 pt-2">
          <Button
            onClick={() => connect(redirectAfter)}
            className="w-full bg-[#1F5A3D] hover:bg-[#1F5A3D]/90 text-white font-bold py-5 rounded-2xl text-[15px]"
          >
            Connect Kroger
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onContinueWithout();
            }}
            className="w-full text-[#6b6b6b] font-medium py-5 rounded-2xl text-[14px]"
          >
            Continue Without Kroger
          </Button>
          <p className="text-[11px] text-[#8a8a8a] text-center px-2 pt-1">
            Without Kroger, pricing accuracy may be reduced.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
