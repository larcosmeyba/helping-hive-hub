import { useState } from "react";
import { Flag, ImageOff, DollarSign, PackageX, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type FeedbackType = "wrong_image" | "wrong_price" | "wrong_product";

interface ReportIssueButtonProps {
  entityType: "meal" | "grocery_item";
  entityName: string;
  entityId?: string;
  compact?: boolean;
}

export function ReportIssueButton({ entityType, entityName, entityId, compact }: ReportIssueButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleReport = async (feedbackType: FeedbackType) => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("user_feedback" as any).insert({
        user_id: user.id,
        feedback_type: feedbackType,
        entity_type: entityType,
        entity_id: entityId || null,
        entity_name: entityName,
        description: `User reported ${feedbackType.replace(/_/g, " ")} for ${entityType}: ${entityName}`,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Thanks for the feedback!", description: "We'll review this shortly." });
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <span className={`inline-flex items-center gap-1 text-accent ${compact ? "text-[8px]" : "text-xs"}`}>
        <Check className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} /> Reported
      </span>
    );
  }

  const options: { type: FeedbackType; label: string; icon: typeof Flag }[] =
    entityType === "meal"
      ? [
          { type: "wrong_image", label: "Wrong image", icon: ImageOff },
          { type: "wrong_price", label: "Wrong price", icon: DollarSign },
        ]
      : [
          { type: "wrong_price", label: "Wrong price", icon: DollarSign },
          { type: "wrong_product", label: "Wrong product match", icon: PackageX },
        ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={submitting}
          className={`text-muted-foreground hover:text-destructive ${compact ? "h-5 w-5 p-0" : "h-6 px-1.5 text-[10px]"}`}
        >
          {submitting ? (
            <Loader2 className={`animate-spin ${compact ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
          ) : (
            <Flag className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((opt) => (
          <DropdownMenuItem key={opt.type} onClick={() => handleReport(opt.type)} className="text-xs gap-2">
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
