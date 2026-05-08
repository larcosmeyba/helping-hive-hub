import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
          headers: { apikey: ANON },
        });
        const data = await r.json();
        if (r.ok && data.valid) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setStatus("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) setStatus("error");
    else if (data?.reason === "already_unsubscribed") setStatus("already");
    else setStatus("done");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Unsubscribe — Help The Hive"
        description="Manage your email preferences for Help The Hive."
        canonical="https://helpthehive.com/unsubscribe"
      />
      <Navbar />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-20 max-w-lg text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Checking your link…</p>
          </div>
        )}
        {status === "valid" && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">
              Unsubscribe from emails
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Click below to stop receiving emails from Help The Hive.
            </p>
            <Button onClick={confirm} size="lg">Confirm unsubscribe</Button>
          </>
        )}
        {status === "submitting" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Updating your preferences…</p>
          </div>
        )}
        {status === "done" && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">You're unsubscribed.</h1>
            <p className="text-muted-foreground">We won't email you anymore. Sorry to see you go.</p>
          </>
        )}
        {status === "already" && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">Already unsubscribed</h1>
            <p className="text-muted-foreground">This email is already opted out of our mailing.</p>
          </>
        )}
        {status === "invalid" && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">Invalid link</h1>
            <p className="text-muted-foreground">
              This unsubscribe link is missing or expired. Email us at{" "}
              <a href="mailto:marcos@helpthehive.com" className="underline hover:text-primary">
                marcos@helpthehive.com
              </a>{" "}
              if you need help.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">Something went wrong</h1>
            <p className="text-muted-foreground">Please try again in a moment.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
