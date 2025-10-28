import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const ReportBranding = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Report branding updated successfully",
    });
  };

  const handlePreview = () => {
    toast({
      title: "Preview",
      description: "Report template preview will open in new window",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Report Branding</CardTitle>
        </div>
        <CardDescription>
          Customize the appearance of your PDF reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">PDF Template</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="header-color">Header Color</Label>
              <div className="flex gap-2">
                <Input
                  id="header-color"
                  type="color"
                  defaultValue="#121D73"
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input defaultValue="#121D73" className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  defaultValue="#252525"
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input defaultValue="#252525" className="flex-1" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="font">Font Family</Label>
            <Select defaultValue="inter">
              <SelectTrigger id="font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">Inter</SelectItem>
                <SelectItem value="arial">Arial</SelectItem>
                <SelectItem value="helvetica">Helvetica</SelectItem>
                <SelectItem value="times">Times New Roman</SelectItem>
                <SelectItem value="roboto">Roboto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Logo Position</Label>
          <RadioGroup defaultValue="left">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="left" id="left" />
              <Label htmlFor="left" className="cursor-pointer">Top Left</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="center" id="center" />
              <Label htmlFor="center" className="cursor-pointer">Top Center</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="right" id="right" />
              <Label htmlFor="right" className="cursor-pointer">Top Right</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Report Footer</Label>
          <Textarea
            defaultValue="Mould & Restoration Co. | ABN: 12 345 678 901&#10;Phone: 1300 665 673 | Email: info@mrc.com.au&#10;www.mrc.com.au"
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            This text appears at the bottom of every report page
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Report Sections to Include</Label>
          <div className="space-y-3">
            {[
              "Executive Summary",
              "Inspection Details",
              "Photos & Evidence",
              "Recommendations",
              "Cost Breakdown",
              "Terms & Conditions"
            ].map((section) => (
              <div key={section} className="flex items-center justify-between">
                <Label htmlFor={section}>{section}</Label>
                <Switch defaultChecked id={section} />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button onClick={handleSave}>Save Changes</Button>
          <Button variant="outline" onClick={handlePreview}>
            Preview Report Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportBranding;
