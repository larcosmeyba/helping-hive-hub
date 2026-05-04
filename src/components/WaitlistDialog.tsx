import { useState, ReactNode } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  name: z.string().trim().max(100).optional().or(z.literal("")),
  zip_code: z.string().trim().max(10).optional().or(z.literal("")),
});

interface Props {
  trigger: ReactNode;
  source?: string;
}

export function WaitlistDialog({ trigger, source }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", zip_code: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your info", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("waitlist_signups").insert({
      email: parsed.data.email,
      name: parsed.data.name || null,
      zip_code: parsed.data.zip_code || null,
      referral_source: source ?? null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        setDone(true);
        return;
      }
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDone(false); setForm({ email: "", name: "", zip_code: "" }); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <CheckCircle2 className="w-14 h-14 text-primary" />
            <DialogHeader>
              <DialogTitle className="text-2xl">You're on the list! 🐝</DialogTitle>
              <DialogDescription className="pt-2">
                Thanks for joining. We'll email you the moment Help The Hive opens to new members.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setOpen(false)} variant="hero" className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Join the waitlist</DialogTitle>
              <DialogDescription>
                We're putting the finishing touches on Help The Hive. Drop your email and we'll let you know the moment it's ready.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="wl-email">Email *</Label>
                <Input id="wl-email" type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-name">First name (optional)</Label>
                <Input id="wl-name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Alex" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-zip">ZIP code (optional)</Label>
                <Input id="wl-zip" value={form.zip_code} maxLength={10}
                  onChange={(e) => setForm({ ...form, zip_code: e.target.value })} placeholder="90210" />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</> : "Notify me at launch"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                No spam. One email when we launch.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
