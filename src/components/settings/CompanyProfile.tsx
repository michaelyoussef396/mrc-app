import { Building2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CompanyProfile = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Company profile updated successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Company Profile</CardTitle>
        </div>
        <CardDescription>
          Manage your business information and branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              defaultValue="Mould & Restoration Co."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="abn">ABN</Label>
            <Input
              id="abn"
              defaultValue="12 345 678 901"
              placeholder="XX XXX XXX XXX"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Business Address *</Label>
          <Input
            placeholder="Street"
            defaultValue="123 Business Street"
            className="mb-2"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Suburb" defaultValue="Melbourne" />
            <Input placeholder="State" defaultValue="VIC" />
            <Input placeholder="Postcode" defaultValue="3000" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="phone">Business Phone *</Label>
            <Input
              id="phone"
              defaultValue="1300 665 673"
              placeholder="1300 XXX XXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Business Email *</Label>
            <Input
              id="email"
              type="email"
              defaultValue="info@mrc.com.au"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload New Logo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            PNG or JPG (max 2MB). Recommended size: 500x500px
          </p>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyProfile;
