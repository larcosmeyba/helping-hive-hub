import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Building2, Newspaper, Handshake } from "lucide-react";

const REQUEST_TYPES = [
  {
    value: "partnership" as const,
    label: "Partnership",
    icon: Handshake,
    desc: "Retailers, food banks, community orgs, and nonprofits.",
  },
  {
    value: "press" as const,
    label: "Press / Media",
    icon: Newspaper,
    desc: "Journalists, podcasters, and content creators.",
  },
  {
    value: "affiliate" as const,
    label: "Affiliate / Creator",
    icon: Building2,
    desc: "Influencers and creators in the family / budget / food space.",
  },
];

const schema = z.object({
  type: z.enum(["partnership", "press", "affiliate"]),
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  organization: z.string().trim().min(2, "Please enter your organization or publication").max(200),
  website: z.string().trim().url("Please enter a valid URL").max(300).optional().or(z.literal("")),
  message: z.string().trim().min(20, "Tell us a bit more — at least 20 characters").max(4000),
});

type FormData = z.infer<typeof schema>;

export default function Partnerships() {
  const [submitted, setSubmitted] = useState(false);
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type");
  const defaultType: FormData["type"] =
    initialType === "press" || initialType === "affiliate" || initialType === "partnership"
      ? initialType
      : "partnership";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType },
  });

  const selectedType = watch("type");

  const onSubmit = async (data: FormData) => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("partnership_requests").insert({
      id,
      request_type: data.type,
      name: data.name,
      email: data.email,
      organization: data.organization,
      website: data.website || null,
      message: data.message,
    });

    if (error) {
      toast.error("Something went wrong", {
        description: "Please try again or email us directly at marcos@helpthehive.com",
      });
      return;
    }

    // Best-effort notification — do not block on failure
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "partnership-request-notification",
          recipientEmail: "marcos@helpthehive.com",
          idempotencyKey: `partnership-request-${id}`,
          templateData: {
            request_type: data.type,
            name: data.name,
            email: data.email,
            organization: data.organization,
            website: data.website || null,
            message: data.message,
          },
        },
      });
    } catch (e) {
      console.warn("[partnership] notification failed (non-blocking)", e);
    }

    setSubmitted(true);
    toast.success("Thanks — we'll be in touch soon");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Partnerships, Press & Affiliates — Help The Hive"
        description="Partner with Help The Hive. We work with retailers, community organizations, journalists, and creators to make budget meal planning accessible to every family."
        canonical="https://helpthehive.com/partnerships"
      />
      <Navbar />
      <main id="main-content" className="flex-1">
        {submitted ? (
          <section className="container mx-auto px-4 py-24 max-w-2xl text-center">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Request received.
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              We read every message personally. You'll hear back within 3 business days at the
              email you provided.
            </p>
            <Button onClick={() => setSubmitted(false)} variant="outline">
              Send another request
            </Button>
          </section>
        ) : (
          <>
            <section className="bg-honey-50 border-b border-border">
              <div className="container mx-auto px-4 py-16 md:py-24 max-w-3xl text-center">
                <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/15 text-primary">
                  Let's work together
                </span>
                <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
                  Partner with Help The Hive
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  We work with retailers, community organizations, journalists, and creators to
                  make budget meal planning accessible to every family.
                </p>
              </div>
            </section>

            <section className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    What can we help with?
                  </Label>
                  <RadioGroup
                    value={selectedType}
                    onValueChange={(v) => setValue("type", v as FormData["type"])}
                    className="grid md:grid-cols-3 gap-3"
                  >
                    {REQUEST_TYPES.map((t) => {
                      const Icon = t.icon;
                      const active = selectedType === t.value;
                      return (
                        <Label
                          key={t.value}
                          htmlFor={`type-${t.value}`}
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            active
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <RadioGroupItem
                            id={`type-${t.value}`}
                            value={t.value}
                            className="sr-only"
                          />
                          <Icon className="h-5 w-5 text-primary mb-2" />
                          <div className="font-semibold text-foreground text-sm">{t.label}</div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {t.desc}
                          </p>
                        </Label>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" {...register("name")} className="mt-1.5" />
                    {errors.name && (
                      <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} className="mt-1.5" />
                    {errors.email && (
                      <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organization">
                      {selectedType === "press"
                        ? "Publication"
                        : selectedType === "affiliate"
                        ? "Channel / Platform"
                        : "Organization"}
                    </Label>
                    <Input id="organization" {...register("organization")} className="mt-1.5" />
                    {errors.organization && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.organization.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://"
                      {...register("website")}
                      className="mt-1.5"
                    />
                    {errors.website && (
                      <p className="text-xs text-destructive mt-1">{errors.website.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Tell us about it</Label>
                  <Textarea
                    id="message"
                    rows={6}
                    {...register("message")}
                    className="mt-1.5"
                    placeholder="What are you hoping to do together?"
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive mt-1">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "Sending..." : "Send request"}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-8">
                Or email us directly at{" "}
                <a
                  href="mailto:marcos@helpthehive.com"
                  className="underline hover:text-primary"
                >
                  marcos@helpthehive.com
                </a>
              </p>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
