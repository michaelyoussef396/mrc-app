import { MapPin, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const zones = [
  {
    name: "Zone 1 - Inner Melbourne",
    travel: "0-15 min travel",
    charge: "No charge",
    suburbs: ["Melbourne CBD", "South Melbourne", "Richmond", "Carlton", "Fitzroy"]
  },
  {
    name: "Zone 2 - Middle Melbourne",
    travel: "15-30 min travel",
    charge: "$50",
    suburbs: ["Glen Waverley", "Box Hill", "Croydon", "Ringwood"]
  },
  {
    name: "Zone 3 - Outer Melbourne",
    travel: "30-45 min travel",
    charge: "$75",
    suburbs: ["Dandenong", "Cranbourne", "Pakenham"]
  },
  {
    name: "Zone 4 - Extended Area",
    travel: "45-60 min travel",
    charge: "$100",
    suburbs: ["Frankston", "Mornington"]
  }
];

const ServiceArea = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Service area updated successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle>Service Area</CardTitle>
        </div>
        <CardDescription>
          Define your service zones and travel charges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Primary Service Area</Label>
          <p className="text-muted-foreground">Greater Melbourne Metropolitan Area</p>
        </div>

        <div className="space-y-6 pt-4">
          <Label className="text-base font-semibold">Service Zones</Label>
          
          {zones.map((zone, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{zone.name}</h4>
                  <p className="text-sm text-muted-foreground">{zone.travel}</p>
                  <p className="text-sm font-medium text-primary mt-1">Travel charge: {zone.charge}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {zone.suburbs.map((suburb) => (
                  <Badge key={suburb} variant="secondary" className="gap-1">
                    {suburb}
                    <button className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Suburb
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Travel Charges</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Zone 1</Label>
              <Input defaultValue="0" type="number" prefix="$" />
            </div>
            <div className="space-y-2">
              <Label>Zone 2</Label>
              <Input defaultValue="50" type="number" prefix="$" />
            </div>
            <div className="space-y-2">
              <Label>Zone 3</Label>
              <Input defaultValue="75" type="number" prefix="$" />
            </div>
            <div className="space-y-2">
              <Label>Zone 4</Label>
              <Input defaultValue="100" type="number" prefix="$" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="outside-area">Accept jobs outside service area</Label>
            <p className="text-sm text-muted-foreground">
              Jobs can be accepted on request basis
            </p>
          </div>
          <Switch defaultChecked id="outside-area" />
        </div>

        <div className="pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceArea;
