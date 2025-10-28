import { Plug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Integrations = () => {
  const { toast } = useToast();

  const handleDisconnect = (service: string) => {
    toast({
      title: "Disconnected",
      description: `${service} has been disconnected`,
    });
  };

  const handleConnect = (service: string) => {
    toast({
      title: "Connected",
      description: `${service} has been connected successfully`,
    });
  };

  const handleTest = () => {
    toast({
      title: "Testing connection",
      description: "Connection test in progress...",
    });
  };

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Integration settings updated successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <CardTitle>Integrations</CardTitle>
        </div>
        <CardDescription>
          Connect external services and manage API connections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Calendar Sync</Label>
          
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">📅</span>
                </div>
                <div>
                  <h4 className="font-semibold">Google Calendar</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      ● Connected
                    </Badge>
                    <span className="text-sm text-muted-foreground">admin@mrc.com.au</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDisconnect("Google Calendar")}>
                  Disconnect
                </Button>
                <Button variant="outline" size="sm">Reconnect</Button>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xl">📆</span>
                </div>
                <div>
                  <h4 className="font-semibold">Outlook Calendar</h4>
                  <Badge variant="secondary" className="mt-1">
                    ○ Not Connected
                  </Badge>
                </div>
              </div>
              <Button onClick={() => handleConnect("Outlook Calendar")}>
                Connect to Outlook
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">AI Services</Label>
          
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <h4 className="font-semibold">OpenAI API</h4>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 mt-1">
                    ● Connected
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2 pl-13">
              <div className="text-sm text-muted-foreground">Model: GPT-4</div>
              <div className="text-sm text-muted-foreground">Monthly usage: 1,247 tokens</div>
              <div className="space-y-2">
                <Label className="text-sm">API Key</Label>
                <Input type="password" defaultValue="sk-...4f2a" />
              </div>
              <Button variant="outline" size="sm">Edit API Key</Button>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">📄</span>
                </div>
                <div>
                  <h4 className="font-semibold">PDF Generation</h4>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 mt-1">
                    ● Connected
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2 pl-13">
              <div className="text-sm text-muted-foreground">Service: PDFMonkey</div>
              <div className="space-y-2">
                <Label className="text-sm">Template ID</Label>
                <Input defaultValue="tmpl_...abc" />
              </div>
              <Button variant="outline" size="sm">Edit Settings</Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Email Provider</Label>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select defaultValue="supabase">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supabase">Supabase Default</SelectItem>
                  <SelectItem value="custom">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom SMTP fields - would show when "Custom SMTP" is selected */}
            <div className="hidden space-y-3 border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2">
                <Label>SMTP Server</Label>
                <Input placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input placeholder="587" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input placeholder="info@mrc.com.au" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button variant="outline" onClick={handleTest}>Test Connection</Button>
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

export default Integrations;
