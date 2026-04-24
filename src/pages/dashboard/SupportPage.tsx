import { useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  // Email is shown read-only for the user's confirmation, but never sent to the server.
  // The server pulls the email from auth.users via the create_support_ticket RPC.
  const displayEmail = user?.email ?? "";
  const [message, setMessage] = useState("");
  const [ticketType, setTicketType] = useState("help");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !message) return;
    setLoading(true);
    try {
      // Server-side RPC: only user_id (from auth.uid()) and the message fields are trusted.
      const { error } = await supabase.rpc("create_support_ticket", {
        _name: name,
        _message: message,
        _ticket_type: ticketType,
      });
      if (error) throw error;
      toast({ title: "Ticket Submitted", description: "We'll get back to you soon!" });
      setName(""); setMessage("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-primary" /> Support Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Submit a bug report, feature suggestion, or help request</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={ticketType} onValueChange={setTicketType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="help">Help Request</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Suggestion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={displayEmail}
              readOnly
              disabled
              className="mt-1 bg-muted/50"
              aria-describedby="email-help"
            />
            <p id="email-help" className="text-xs text-muted-foreground mt-1">
              We'll reply to your account email.
            </p>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} className="mt-1" placeholder="Describe your issue or suggestion..." />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90">
            <Send className="w-4 h-4 mr-2" /> {loading ? "Submitting..." : "Submit Ticket"}
          </Button>
        </form>
      </div>
    </div>
  );
}
