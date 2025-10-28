import { useState } from "react";
import { Wrench, Plus, Pencil, Trash2, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const equipmentData = [
  { name: "Dehumidifier", cost: 132.00, status: "Active" },
  { name: "Air Mover / Blower", cost: 46.00, status: "Active" },
  { name: "RCD", cost: 5.00, status: "Active" },
];

const EquipmentMaterials = () => {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSave = () => {
    toast({
      title: "Equipment added",
      description: "New equipment has been added successfully",
    });
    setIsAddOpen(false);
  };

  const handleDelete = (name: string) => {
    toast({
      title: "Equipment deleted",
      description: `${name} has been removed`,
      variant: "destructive"
    });
  };

  const handleEdit = () => {
    toast({
      title: "Equipment updated",
      description: "Equipment details have been updated successfully",
    });
    setIsEditOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <CardTitle>Equipment & Materials</CardTitle>
            </div>
            <CardDescription className="mt-1.5">
              Drying equipment hire rates (per day, excluding GST)
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
                <DialogDescription>
                  Add equipment to your inventory
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="eq-name">Equipment Name *</Label>
                  <Input id="eq-name" placeholder="e.g., Industrial Dehumidifier" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-cost">Daily Cost (excluding GST) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input id="eq-cost" type="number" placeholder="0.00" className="pl-7" step="0.01" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-category">Category</Label>
                  <Select defaultValue="drying">
                    <SelectTrigger id="eq-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drying">Drying Equipment</SelectItem>
                      <SelectItem value="testing">Testing Equipment</SelectItem>
                      <SelectItem value="safety">Safety Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-desc">Description (optional)</Label>
                  <Input id="eq-desc" placeholder="Brief description" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="eq-active">Available for hire</Label>
                  <Switch defaultChecked id="eq-active" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Name</TableHead>
                <TableHead className="text-right">Daily Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentData.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">${item.cost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Equipment</DialogTitle>
                            <DialogDescription>
                              Update equipment details
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Equipment Name *</Label>
                              <Input id="edit-name" defaultValue={item.name} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-cost">Daily Cost (excluding GST) *</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input id="edit-cost" type="number" defaultValue={item.cost} className="pl-7" step="0.01" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <Label htmlFor="edit-active">Available for hire</Label>
                              <Switch defaultChecked id="edit-active" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleEdit}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              GST (10%) is added to equipment hire during quote calculation.
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              Example: Dehumidifier for 3 days: $132.00 × 3 = $396.00 + GST = $435.60 total
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Label className="text-sm font-medium">Equipment Hire Calculation</Label>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground ml-4">
            <li>• Price shown is per day rate</li>
            <li>• Multi-day hires: Daily Rate × Number of Days</li>
            <li>• GST applied to total equipment cost</li>
            <li>• Equipment costs are separate from labor costs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentMaterials;
