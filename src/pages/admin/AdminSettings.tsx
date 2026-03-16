import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function AdminSettings() {
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState("Help The Hive");
  const [notifyNewUsers, setNotifyNewUsers] = useState(true);
  const [notifyNewTickets, setNotifyNewTickets] = useState(true);

  const handleSave = () => {
    toast({ title: "Settings saved" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage platform configuration</p>
      </div>

      {/* Business Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Business Information</CardTitle>
          <CardDescription>Basic platform settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Business Name</Label>
            <Input value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Notification Preferences</CardTitle>
          <CardDescription>Control what triggers notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New User Signups</p>
              <p className="text-xs text-muted-foreground">Get notified when new users register</p>
            </div>
            <Switch checked={notifyNewUsers} onCheckedChange={setNotifyNewUsers} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Support Tickets</p>
              <p className="text-xs text-muted-foreground">Get notified for new support tickets</p>
            </div>
            <Switch checked={notifyNewTickets} onCheckedChange={setNotifyNewTickets} />
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Form Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">User Intake Form</CardTitle>
          <CardDescription>Control which fields users fill out during onboarding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Household Size", enabled: true },
              { label: "Location (ZIP)", enabled: true },
              { label: "User Type", enabled: true },
              { label: "SNAP Status", enabled: true },
              { label: "Budget Preferences", enabled: true },
              { label: "Dietary Needs", enabled: true },
              { label: "Allergies", enabled: true },
              { label: "Preferred Stores", enabled: true },
            ].map(field => (
              <div key={field.label} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{field.label}</span>
                <Switch defaultChecked={field.enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
