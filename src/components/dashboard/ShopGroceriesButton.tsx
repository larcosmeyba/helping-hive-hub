import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { GroceryCTAButton, type GroceryCTAVariant } from "@/components/grocery/GroceryCTAButton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Download, ExternalLink, ChevronDown } from "lucide-react";

/**
 * Grocery-list action button. Originally sent the list to Instacart; now
 * provides Kroger and manual shopping actions:
 *   • Copy Grocery List   (clipboard)
 *   • Export Grocery List (CSV download)
 *   • Shop at Kroger      (opens kroger.com)
 *
 * Prop shape is preserved so existing callers compile unchanged.
 */

export interface GroceryLineItem {
  name: string;
  quantity?: number;
  unit?: string;
  display_text?: string;
}

interface Props {
  title: string;
  lineItems: GroceryLineItem[];
  imageUrl?: string;
  linkType?: "shopping_list" | "recipe";
  instructions?: string[];
  className?: string;
  variant?: GroceryCTAVariant;
  label?: string;
  partnerLinkbackUrl?: string;
  fullWidth?: boolean;
  showExternalIcon?: boolean;
}

function formatLine(item: GroceryLineItem): string {
  if (item.display_text && item.display_text.trim()) return item.display_text.trim();
  const qty = item.quantity ? `${item.quantity}${item.unit ? " " + item.unit : ""} ` : "";
  return `${qty}${item.name}`.trim();
}

function toCsv(title: string, items: GroceryLineItem[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    [title],
    ["Item", "Quantity", "Unit"],
    ...items.map((i) => [i.name, i.quantity ?? "", i.unit ?? ""]),
  ];
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ShopGroceriesButton({
  title,
  lineItems,
  className,
  variant = "dark",
  label = "Grocery List",
  fullWidth = false,
  showExternalIcon = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const empty = lineItems.length === 0;

  const handleCopy = async () => {
    if (empty) return;
    const text = `${title}\n\n${lineItems.map((i) => `• ${formatLine(i)}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Grocery list copied", description: `${lineItems.length} item${lineItems.length === 1 ? "" : "s"} on the clipboard.` });
      void trackEvent("grocery_list_copied", { itemCount: lineItems.length, title });
    } catch {
      toast({ title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (empty) return;
    const safe = title.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "grocery-list";
    downloadFile(`${safe}.csv`, toCsv(title, lineItems), "text/csv");
    toast({ title: "Grocery list exported", description: "CSV saved to your device." });
    void trackEvent("grocery_list_exported", { itemCount: lineItems.length, title });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span className={fullWidth ? "block" : "inline-block"}>
          <GroceryCTAButton
            disabled={empty}
            variant={variant}
            label={label}
            fullWidth={fullWidth}
            showExternalIcon={showExternalIcon}
            className={className}
          />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" /> Copy Grocery List
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Grocery List
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
