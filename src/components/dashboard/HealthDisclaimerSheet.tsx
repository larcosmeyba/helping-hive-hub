import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hth_health_disclaimer_ack";

/**
 * One-time health disclaimer sheet shown on first launch. Dismissed forever after acknowledge.
 */
export function HealthDisclaimerSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleAck = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleAck(); }}>
      <DialogContent className="max-w-[360px] rounded-2xl p-0 overflow-hidden border-0">
        <div className="bg-gradient-honey px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
            <Heart className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-primary-foreground">
            A Quick Note on Health
          </h2>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Help the Hive provides planning and budgeting tools only. It is not medical or
            nutritional advice. Consult a healthcare provider for dietary guidance.
          </p>

          <Button
            onClick={handleAck}
            className="w-full h-12 bg-gradient-honey text-primary-foreground hover:opacity-90 font-semibold rounded-xl"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
