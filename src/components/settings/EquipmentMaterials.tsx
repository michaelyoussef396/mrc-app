import { useState } from "react";
import { Wrench, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const equipmentData = [
  { name: "Dehumidifier (Large)", cost: 80, status: "Active" },
  { name: "Air Scrubber", cost: 60, status: "Active" },
  { name: "Moisture Meter", cost: 15, status: "Active" },
  { name: "Thermal Camera", cost: 50, status: "Active" },
  { name: "HEPA Vacuum", cost: 40, status: "Active" },
  { name: "Air Mover (Fan)", cost: 25, status: "Active" },
  { name: "Containment Barrier", cost: 30, status: "Active" }
];

const EquipmentMaterials = () => {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

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
              Manage equipment inventory and daily rental costs
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
                  Add equipment or materials to your inventory
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="eq-name">Equipment Name *</Label>
                  <Input id="eq-name" placeholder="e.g., Industrial Dehumidifier" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-cost">Daily Cost *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input id="eq-cost" type="number" placeholder="0.00" className="pl-7" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-category">Category</Label>
                  <Select defaultValue="equipment">
                    <SelectTrigger id="eq-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="consumable">Consumable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-desc">Description (optional)</Label>
                  <Input id="eq-desc" placeholder="Brief description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-stock">Stock quantity (optional)</Label>
                  <Input id="eq-stock" type="number" placeholder="0" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Equipment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Daily Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentData.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>${item.cost}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4" />
                      </Button>
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
      </CardContent>
    </Card>
  );
};

export default EquipmentMaterials;
