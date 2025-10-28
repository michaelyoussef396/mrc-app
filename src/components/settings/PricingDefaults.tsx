import { DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const PricingDefaults = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Pricing defaults updated successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>Pricing Defaults</CardTitle>
        </div>
        <CardDescription>
          Configure default rates and pricing structure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Labor Rates</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Standard hourly rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input defaultValue="120" type="number" className="pl-7" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>After hours rate (1.5x)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input defaultValue="180" type="number" className="pl-7" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Emergency rate (2x)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input defaultValue="240" type="number" className="pl-7" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Minimum charge (hours)</Label>
              <Input defaultValue="2" type="number" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Call-out Fee</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Standard call-out</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input defaultValue="150" type="number" className="pl-7" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Emergency call-out</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input defaultValue="300" type="number" className="pl-7" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Discount Structure</Label>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>8+ hours</Label>
              <div className="relative">
                <Input defaultValue="10" type="number" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>16+ hours</Label>
              <div className="relative">
                <Input defaultValue="12" type="number" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>24+ hours (max)</Label>
              <div className="relative">
                <Input defaultValue="13" type="number" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Multi-day Jobs</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="multiday">Apply consecutive day discount</Label>
              <p className="text-sm text-muted-foreground">
                Discount applies for jobs spanning multiple days
              </p>
            </div>
            <Switch defaultChecked id="multiday" />
          </div>
          <div className="space-y-2">
            <Label>Discount per additional day</Label>
            <div className="relative w-full sm:w-48">
              <Input defaultValue="5" type="number" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">GST</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="gst">Include GST in prices (10%)</Label>
              <p className="text-sm text-muted-foreground">
                All displayed prices include 10% GST
              </p>
            </div>
            <Switch defaultChecked id="gst" />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Quote Validity</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quote valid for (days)</Label>
              <Input defaultValue="30" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Payment terms (days)</Label>
              <Input defaultValue="14" type="number" />
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

export default PricingDefaults;
