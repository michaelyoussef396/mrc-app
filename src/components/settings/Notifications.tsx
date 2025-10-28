import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const notificationSettings = [
  {
    title: "New Lead",
    description: "Send notification when a new lead is created",
    recipients: "admin@mrc.com.au, sarah@mrc.com.au",
    enabled: true
  },
  {
    title: "Quote Accepted",
    description: "Send notification when a quote is accepted",
    recipients: "admin@mrc.com.au",
    enabled: true
  },
  {
    title: "Inspection Scheduled",
    description: "Send notification when an inspection is scheduled",
    recipients: "Assigned Technician, admin@mrc.com.au",
    enabled: true
  },
  {
    title: "Report Completed",
    description: "Send notification when a report is completed",
    recipients: "Assigned Technician, admin@mrc.com.au",
    enabled: true
  },
  {
    title: "Payment Received",
    description: "Send notification when payment is received",
    recipients: "admin@mrc.com.au",
    enabled: true
  }
];

const Notifications = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Notification preferences updated successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>
          Configure email and SMS notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Email Notifications</Label>
          
          {notificationSettings.map((setting, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <Label htmlFor={`notify-${index}`} className="text-base cursor-pointer">
                      {setting.title}
                    </Label>
                    <Switch defaultChecked={setting.enabled} id={`notify-${index}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Recipients</Label>
                <div className="flex gap-2">
                  <Input
                    defaultValue={setting.recipients}
                    placeholder="email1@example.com, email2@example.com"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">SMS Notifications</Label>
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms">Enable SMS notifications</Label>
                <p className="text-sm text-muted-foreground">
                  SMS functionality will be available soon
                </p>
              </div>
              <Switch disabled id="sms" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Reminder Settings</Label>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quote follow-up after</Label>
              <div className="flex gap-2">
                <Input defaultValue="3" type="number" />
                <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">days</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inspection reminder</Label>
              <div className="flex gap-2">
                <Input defaultValue="1" type="number" />
                <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">day before</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment reminder after</Label>
              <div className="flex gap-2">
                <Input defaultValue="7" type="number" />
                <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Notifications;
