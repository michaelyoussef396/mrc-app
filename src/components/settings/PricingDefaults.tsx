import { DollarSign, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const costAnchors = [
  { jobType: "No Demolition (Surface)", twoHours: 612.00, eightHours: 1216.99 },
  { jobType: "Demo", twoHours: 711.90, eightHours: 1798.90 },
  { jobType: "Construction", twoHours: 661.96, eightHours: 1507.95 },
  { jobType: "Subfloor", twoHours: 900.00, eightHours: 2334.69 },
];

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
          Configure cost anchors and discount structure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost Anchors */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Cost Anchors (Excluding GST)</Label>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Type</TableHead>
                  <TableHead className="text-right">2 Hours</TableHead>
                  <TableHead className="text-right">8 Hours (Full Day)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costAnchors.map((item) => (
                  <TableRow key={item.jobType}>
                    <TableCell className="font-medium">{item.jobType}</TableCell>
                    <TableCell className="text-right">${item.twoHours.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.eightHours.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              These are base costs excluding GST. GST (10%) is added during quote calculation.
            </p>
          </div>
          <Button variant="outline" size="sm">Edit Cost Anchors</Button>
        </div>

        {/* Discount Structure */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Discount Structure</Label>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">8 hours (1 full day)</h4>
                  <p className="text-sm text-muted-foreground">No discount applied</p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">0%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This is the standard full day rate
              </p>
            </div>

            <div className="p-4 border rounded-lg space-y-3 bg-green-500/5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">16 hours (2 full days)</h4>
                  <p className="text-sm text-muted-foreground">7.5% discount applied</p>
                </div>
                <span className="text-sm font-semibold text-green-600">-7.5%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Multiplier: 0.925x hourly rate
              </p>
              <p className="text-xs text-muted-foreground">
                Example: If 8h = $1,216.99, then 16h = $2,251.43
              </p>
            </div>

            <div className="p-4 border rounded-lg space-y-3 bg-green-500/10">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">24+ hours (3+ days)</h4>
                  <p className="text-sm text-muted-foreground">Maximum discount applied</p>
                </div>
                <span className="text-sm font-semibold text-green-600">-13%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Multiplier: 0.87x hourly rate (maximum cap)
              </p>
              <p className="text-xs text-muted-foreground">
                Example: If 8h = $1,216.99, then 24h = $3,180.27
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Discount Calculation Rules</Label>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• 0-8 hours: No discount</li>
              <li>• 9-16 hours: 7.5% discount (0.925x hourly rate)</li>
              <li>• 17+ hours: Scale up to maximum 13% discount (0.87x)</li>
              <li>• Maximum discount cap: 13% regardless of duration</li>
            </ul>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-md border border-blue-500/20">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Discounts apply to hourly rates for multi-day consecutive jobs. 8 hours = 1 full working day.
            </p>
          </div>
        </div>

        {/* GST */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">GST</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="gst">Add GST (10%) to all quoted prices</Label>
              <p className="text-sm text-muted-foreground">
                GST is calculated AFTER discounts are applied
              </p>
            </div>
            <Switch defaultChecked id="gst" />
          </div>
        </div>

        {/* Quote Validity */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Quote Validity</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valid for (days)</Label>
              <Input defaultValue="30" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Payment terms (days from completion)</Label>
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
