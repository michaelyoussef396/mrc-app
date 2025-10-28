import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Home,
  ClipboardList,
  Droplets,
  Bug,
  Search,
  Waves,
  AlertTriangle,
  Package,
  Shield,
  Wrench,
  Box,
  DollarSign,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Save,
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface InspectionData {
  // Section 1: Client Information
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  alternativeContactName?: string;
  alternativeContactPhone?: string;
  alternativeContactRelationship?: string;
  preferredContactMethods: string[];
  bestTimeToContact?: string;

  // Section 2: Property Details
  propertyAddress: string;
  propertyType: string;
  propertyAge?: string;
  roomsAffected: number;
  propertySize?: string;
  occupancyStatus: string;
  accessCode?: string;
  parkingNotes?: string;
  specialInstructions?: string;

  // Section 3: Inspection Details
  inspectionDate: string;
  startTime: string;
  technician: string;
  weatherConditions: string;
  temperature?: number;
  inspectionType: string;
  reasonForInspection: string;
  clientPresent: boolean;
  accessProvidedBy?: string;

  // Section 4: Moisture Readings
  moistureReadings: Array<{
    id: string;
    room: string;
    surface: string;
    moisturePercent: number;
    status: string;
  }>;
  moistureAssessment: string;

  // Section 5: Visible Mould
  mouldPresent: string;
  mouldLocations: Array<{
    id: string;
    room: string;
    specificLocation: string;
    mouldTypes: string[];
    coverageArea: string;
    severity: string;
    photos: string[];
    description: string;
  }>;
  overallAffectedAreaSize: string;

  // Section 6: Hidden Mould
  hiddenMouldSuspected: boolean;
  hiddenMouldIndicators: string[];
  suspectedLocations: Array<{
    id: string;
    area: string;
    reason: string;
    accessRequired: boolean;
    method: string;
  }>;
  invasiveInspectionRecommended: boolean;
  invasiveInspectionCost?: string;

  // Section 7: Water Damage
  waterSourceIdentified: string;
  waterSource?: string;
  waterSourceLocation?: string;
  waterSourceStatus?: string;
  waterType: string;
  damageTimeframe: string;
  affectedBuildingElements: string[];
  waterDamageDescription: string;

  // Section 8: Structural Damage
  structuralDamagePresent: string;
  damagedElements: string[];
  damageSeverity?: string;
  safetyConcerns: string[];
  structuralEngineerRequired: string;
  structuralDescription: string;

  // Section 9: Affected Materials
  materials: Array<{
    id: string;
    materialType: string;
    location: string;
    quantity: string;
    condition: string;
    photos: string[];
  }>;
  disposalRequired: boolean;
  estimatedVolume?: string;

  // Section 10: Health & Safety
  healthRisks: string[];
  mouldHealthSymptoms: boolean;
  symptoms: string[];
  vulnerableOccupants: string[];
  containmentRequired: boolean;
  ppeRequired: string[];
  occupancyDuringRemediation: string;
  safetyRecommendations: string;

  // Section 11: Remediation Scope
  jobType: string;
  workRequired: string[];
  detailedScope: string;
  specialConsiderations: string;

  // Section 12: Equipment Required
  equipment: Array<{
    name: string;
    dailyRate: number;
    quantity: number;
    duration: number;
    subtotal: number;
  }>;
  equipmentNotes: string;

  // Section 13: Cost Calculation
  estimatedDuration: number;
  materialCosts: number;
  disposalFees: number;
  otherCosts: number;
  additionalCostsDescription: string;
  paymentTerms: string;

  // Section 14: Timeline & Schedule
  estimatedStartDate: string;
  jobDuration: number;
  dryingTime: number;
  workStartTime: string;
  workFinishTime: string;
  technicianAssignment: string;
  clientAvailabilityRequired: string;
  schedulingNotes: string;

  // Section 15: Technician Notes
  inspectionSummary: string;
  immediateActions: string[];
  longTermPrevention: string[];
  additionalServices: string[];
  priorityLevel: string;
  insuranceClaim: boolean;
  insurer?: string;
  claimNumber?: string;
  assessor?: string;
  internalNotes: string;
}

const sections = [
  { id: 1, title: "Client Information", icon: User },
  { id: 2, title: "Property Details", icon: Home },
  { id: 3, title: "Inspection Details", icon: ClipboardList },
  { id: 4, title: "Moisture Readings", icon: Droplets },
  { id: 5, title: "Visible Mould", icon: Bug },
  { id: 6, title: "Hidden Mould", icon: Search },
  { id: 7, title: "Water Damage Assessment", icon: Waves },
  { id: 8, title: "Structural Damage", icon: AlertTriangle },
  { id: 9, title: "Affected Materials", icon: Package },
  { id: 10, title: "Health & Safety Concerns", icon: Shield },
  { id: 11, title: "Remediation Scope", icon: Wrench },
  { id: 12, title: "Equipment Required", icon: Box },
  { id: 13, title: "Cost Calculation", icon: DollarSign },
  { id: 14, title: "Timeline & Schedule", icon: Calendar },
  { id: 15, title: "Technician Notes", icon: FileText },
];

const jobTypePricing = {
  "No Demolition": { twoHour: 612.00, eightHour: 1216.99 },
  "Demo": { twoHour: 711.90, eightHour: 1798.90 },
  "Construction": { twoHour: 661.96, eightHour: 1507.95 },
  "Subfloor": { twoHour: 900.00, eightHour: 2334.69 },
};

export default function InspectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<InspectionData>({
    // Initialize with default/demo values
    clientName: "John Smith",
    clientEmail: "john.smith@email.com",
    clientPhone: "0412 345 678",
    preferredContactMethods: ["Phone", "Email"],
    propertyAddress: "45 High St, Croydon VIC 3136",
    propertyType: "Residential - House",
    roomsAffected: 2,
    occupancyStatus: "Owner Occupied",
    inspectionDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    technician: "Sarah Martinez",
    weatherConditions: "Sunny",
    temperature: 22,
    inspectionType: "Initial Inspection",
    reasonForInspection: "Customer reported mould in bathroom after water leak",
    clientPresent: true,
    moistureReadings: [],
    moistureAssessment: "",
    mouldPresent: "Yes",
    mouldLocations: [],
    overallAffectedAreaSize: "Small",
    hiddenMouldSuspected: false,
    hiddenMouldIndicators: [],
    suspectedLocations: [],
    invasiveInspectionRecommended: false,
    waterSourceIdentified: "Yes",
    waterType: "Clean Water (Category 1)",
    damageTimeframe: "Within 48 hours",
    affectedBuildingElements: [],
    waterDamageDescription: "",
    structuralDamagePresent: "No",
    damagedElements: [],
    safetyConcerns: [],
    structuralEngineerRequired: "No",
    structuralDescription: "",
    materials: [],
    disposalRequired: true,
    healthRisks: [],
    mouldHealthSymptoms: false,
    symptoms: [],
    vulnerableOccupants: [],
    containmentRequired: true,
    ppeRequired: [],
    occupancyDuringRemediation: "Vacate affected areas",
    safetyRecommendations: "",
    jobType: "Demo",
    workRequired: [],
    detailedScope: "",
    specialConsiderations: "",
    equipment: [],
    equipmentNotes: "",
    estimatedDuration: 8,
    materialCosts: 0,
    disposalFees: 0,
    otherCosts: 0,
    additionalCostsDescription: "",
    paymentTerms: "14 days from completion",
    estimatedStartDate: "",
    jobDuration: 1,
    dryingTime: 3,
    workStartTime: "08:00",
    workFinishTime: "16:00",
    technicianAssignment: "Michael Chen",
    clientAvailabilityRequired: "Yes - Day 1 only",
    schedulingNotes: "",
    inspectionSummary: "",
    immediateActions: [],
    longTermPrevention: [],
    additionalServices: [],
    priorityLevel: "High",
    insuranceClaim: false,
    internalNotes: "",
  });

  const progress = (currentSection / sections.length) * 100;

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setInterval(() => {
      handleSave();
    }, 30000); // Every 30 seconds

    return () => clearInterval(autoSave);
  }, [formData]);

  const handleSave = () => {
    // In real app, save to localStorage or database
    localStorage.setItem(`inspection-draft-${id || 'new'}`, JSON.stringify(formData));
    setLastSaved(new Date());
    toast.success("Progress saved");
  };

  const updateFormData = (updates: Partial<InspectionData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const goToNextSection = () => {
    if (currentSection < sections.length) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousSection = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0);
    }
  };

  const calculateCosts = () => {
    const pricing = jobTypePricing[formData.jobType as keyof typeof jobTypePricing] || jobTypePricing["Demo"];
    const hours = formData.estimatedDuration;
    
    let laborCost = 0;
    let discount = 0;

    if (hours <= 2) {
      laborCost = pricing.twoHour;
    } else if (hours <= 8) {
      laborCost = pricing.eightHour;
    } else if (hours <= 16) {
      laborCost = pricing.eightHour * 2;
      discount = laborCost * 0.075; // 7.5% discount
    } else {
      const days = Math.ceil(hours / 8);
      laborCost = pricing.eightHour * days;
      discount = laborCost * 0.13; // 13% max discount
    }

    const laborAfterDiscount = laborCost - discount;

    const equipmentCost = formData.equipment.reduce((sum, item) => sum + item.subtotal, 0);
    const subtotal = laborAfterDiscount + equipmentCost + formData.materialCosts + formData.disposalFees + formData.otherCosts;
    const gst = subtotal * 0.1;
    const total = subtotal + gst;

    return {
      laborCost,
      discount,
      laborAfterDiscount,
      equipmentCost,
      subtotal,
      gst,
      total,
    };
  };

  const handleComplete = () => {
    // Validate required fields
    const requiredFields = [
      formData.clientName,
      formData.clientEmail,
      formData.clientPhone,
      formData.propertyAddress,
      formData.reasonForInspection,
    ];

    if (requiredFields.some(field => !field)) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsCompleteDialogOpen(true);
  };

  const confirmComplete = () => {
    // In real app, submit to database and trigger report generation
    toast.success("Inspection completed successfully!");
    navigate("/leads");
  };

  const renderSection = () => {
    switch (currentSection) {
      case 1:
        return renderClientInformation();
      case 2:
        return renderPropertyDetails();
      case 3:
        return renderInspectionDetails();
      case 4:
        return renderMoistureReadings();
      case 5:
        return renderVisibleMould();
      case 6:
        return renderHiddenMould();
      case 7:
        return renderWaterDamage();
      case 8:
        return renderStructuralDamage();
      case 9:
        return renderAffectedMaterials();
      case 10:
        return renderHealthSafety();
      case 11:
        return renderRemediationScope();
      case 12:
        return renderEquipmentRequired();
      case 13:
        return renderCostCalculation();
      case 14:
        return renderTimelineSchedule();
      case 15:
        return renderTechnicianNotes();
      default:
        return null;
    }
  };

  const renderClientInformation = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Client Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Client Name *</Label>
          <Input
            value={formData.clientName}
            onChange={(e) => updateFormData({ clientName: e.target.value })}
            placeholder="John Smith"
          />
        </div>
        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={formData.clientEmail}
            onChange={(e) => updateFormData({ clientEmail: e.target.value })}
            placeholder="john.smith@email.com"
          />
        </div>
        <div>
          <Label>Phone *</Label>
          <Input
            value={formData.clientPhone}
            onChange={(e) => updateFormData({ clientPhone: e.target.value })}
            placeholder="0412 345 678"
          />
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Alternative Contact (optional)</h3>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.alternativeContactName || ""}
                onChange={(e) => updateFormData({ alternativeContactName: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.alternativeContactPhone || ""}
                onChange={(e) => updateFormData({ alternativeContactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Select
                value={formData.alternativeContactRelationship}
                onValueChange={(value) => updateFormData({ alternativeContactRelationship: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Landlord">Landlord</SelectItem>
                  <SelectItem value="Property Manager">Property Manager</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label>Preferred Contact Method</Label>
          <div className="flex flex-wrap gap-4 mt-2">
            {["Phone", "Email", "SMS"].map((method) => (
              <div key={method} className="flex items-center space-x-2">
                <Checkbox
                  id={method}
                  checked={formData.preferredContactMethods.includes(method)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFormData({
                        preferredContactMethods: [...formData.preferredContactMethods, method],
                      });
                    } else {
                      updateFormData({
                        preferredContactMethods: formData.preferredContactMethods.filter((m) => m !== method),
                      });
                    }
                  }}
                />
                <label htmlFor={method}>{method}</label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Best Time to Contact</Label>
          <Select
            value={formData.bestTimeToContact}
            onValueChange={(value) => updateFormData({ bestTimeToContact: value })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="Anytime">Anytime</SelectItem>
              <SelectItem value="Mornings">Mornings</SelectItem>
              <SelectItem value="Afternoons">Afternoons</SelectItem>
              <SelectItem value="Evenings">Evenings</SelectItem>
              <SelectItem value="Weekends">Weekends</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  const renderPropertyDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Property Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Property Address *</Label>
          <Input
            value={formData.propertyAddress}
            onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
          />
        </div>

        <div>
          <Label>Property Type *</Label>
          <RadioGroup
            value={formData.propertyType}
            onValueChange={(value) => updateFormData({ propertyType: value })}
          >
            {["Residential - House", "Residential - Apartment/Unit", "Commercial - Office", "Commercial - Retail", "Commercial - Industrial", "Strata/Body Corporate"].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <RadioGroupItem value={type} id={type} />
                <Label htmlFor={type}>{type}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label>Property Age</Label>
          <Select
            value={formData.propertyAge}
            onValueChange={(value) => updateFormData({ propertyAge: value })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select age" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="New (<5)">New (&lt;5 years)</SelectItem>
              <SelectItem value="5-10 years">5-10 years</SelectItem>
              <SelectItem value="10-20 years">10-20 years</SelectItem>
              <SelectItem value="20-30 years">20-30 years</SelectItem>
              <SelectItem value="30-50 years">30-50 years</SelectItem>
              <SelectItem value="50+ years">50+ years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Number of Rooms Affected *</Label>
          <Input
            type="number"
            value={formData.roomsAffected}
            onChange={(e) => updateFormData({ roomsAffected: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div>
          <Label>Total Property Size (m²)</Label>
          <Input
            value={formData.propertySize || ""}
            onChange={(e) => updateFormData({ propertySize: e.target.value })}
            placeholder="Approximate"
          />
        </div>

        <div>
          <Label>Occupancy Status</Label>
          <RadioGroup
            value={formData.occupancyStatus}
            onValueChange={(value) => updateFormData({ occupancyStatus: value })}
          >
            {["Owner Occupied", "Tenant Occupied", "Vacant", "Under Renovation"].map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <RadioGroupItem value={status} id={status} />
                <Label htmlFor={status}>{status}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Access Details</h3>
          <div className="space-y-3">
            <div>
              <Label>Access Code</Label>
              <Input
                value={formData.accessCode || ""}
                onChange={(e) => updateFormData({ accessCode: e.target.value })}
              />
            </div>
            <div>
              <Label>Parking Notes</Label>
              <Input
                value={formData.parkingNotes || ""}
                onChange={(e) => updateFormData({ parkingNotes: e.target.value })}
                placeholder="e.g., Street parking available"
              />
            </div>
            <div>
              <Label>Special Instructions</Label>
              <Textarea
                value={formData.specialInstructions || ""}
                onChange={(e) => updateFormData({ specialInstructions: e.target.value })}
                placeholder="e.g., Knock loudly, doorbell broken"
                className="bg-background"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderInspectionDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Inspection Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Inspection Date *</Label>
            <Input
              type="date"
              value={formData.inspectionDate}
              onChange={(e) => updateFormData({ inspectionDate: e.target.value })}
              className="bg-background"
            />
          </div>
          <div>
            <Label>Start Time *</Label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => updateFormData({ startTime: e.target.value })}
              className="bg-background"
            />
          </div>
        </div>

        <div>
          <Label>Technician *</Label>
          <Input
            value={formData.technician}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Weather Conditions</Label>
            <Select
              value={formData.weatherConditions}
              onValueChange={(value) => updateFormData({ weatherConditions: value })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="Sunny">Sunny</SelectItem>
                <SelectItem value="Cloudy">Cloudy</SelectItem>
                <SelectItem value="Rainy">Rainy</SelectItem>
                <SelectItem value="Stormy">Stormy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Temperature (°C)</Label>
            <Input
              type="number"
              value={formData.temperature || ""}
              onChange={(e) => updateFormData({ temperature: parseFloat(e.target.value) })}
              className="bg-background"
            />
          </div>
        </div>

        <div>
          <Label>Inspection Type *</Label>
          <RadioGroup
            value={formData.inspectionType}
            onValueChange={(value) => updateFormData({ inspectionType: value })}
          >
            {["Initial Inspection", "Follow-up Inspection", "Post-Remediation Check", "Insurance Assessment"].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <RadioGroupItem value={type} id={type} />
                <Label htmlFor={type}>{type}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label>Reason for Inspection *</Label>
          <Textarea
            value={formData.reasonForInspection}
            onChange={(e) => updateFormData({ reasonForInspection: e.target.value })}
            placeholder="e.g., Customer reported mould in bathroom after water leak from burst pipe"
            className="bg-background"
          />
        </div>

        <div>
          <Label>Client Present During Inspection?</Label>
          <RadioGroup
            value={formData.clientPresent ? "Yes" : "No"}
            onValueChange={(value) => updateFormData({ clientPresent: value === "Yes" })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="client-yes" />
              <Label htmlFor="client-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="client-no" />
              <Label htmlFor="client-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        {!formData.clientPresent && (
          <div>
            <Label>If No, who provided access?</Label>
            <Input
              value={formData.accessProvidedBy || ""}
              onChange={(e) => updateFormData({ accessProvidedBy: e.target.value })}
              className="bg-background"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Simplified rendering for remaining sections (4-15)
  // In production, each would be fully implemented like sections 1-3
  const renderMoistureReadings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Moisture Readings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Moisture readings help determine extent of water damage
        </p>
        <Button variant="outline" className="w-full">
          + Add Moisture Reading
        </Button>
        <div>
          <Label>Overall Moisture Assessment</Label>
          <Textarea
            value={formData.moistureAssessment}
            onChange={(e) => updateFormData({ moistureAssessment: e.target.value })}
            placeholder="Describe overall moisture assessment..."
            className="bg-background"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderVisibleMould = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Visible Mould
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Mould Present?</Label>
          <RadioGroup
            value={formData.mouldPresent}
            onValueChange={(value) => updateFormData({ mouldPresent: value })}
          >
            {["Yes", "No", "Suspected"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`mould-${option}`} />
                <Label htmlFor={`mould-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        {formData.mouldPresent === "Yes" && (
          <>
            <Button variant="outline" className="w-full">
              + Add Mould Location
            </Button>
            <div>
              <Label>Overall Affected Area Size</Label>
              <RadioGroup
                value={formData.overallAffectedAreaSize}
                onValueChange={(value) => updateFormData({ overallAffectedAreaSize: value })}
              >
                {["Small (<5m²)", "Medium (5-20m²)", "Large (>20m²)"].map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <RadioGroupItem value={size} id={size} />
                    <Label htmlFor={size}>{size}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderHiddenMould = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Hidden Mould
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Hidden Mould Suspected?</Label>
          <RadioGroup
            value={formData.hiddenMouldSuspected ? "Yes" : "No"}
            onValueChange={(value) => updateFormData({ hiddenMouldSuspected: value === "Yes" })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="hidden-yes" />
              <Label htmlFor="hidden-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="hidden-no" />
              <Label htmlFor="hidden-no">No</Label>
            </div>
          </RadioGroup>
        </div>
        {formData.hiddenMouldSuspected && (
          <Button variant="outline" className="w-full">
            + Add Suspected Location
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const renderWaterDamage = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5" />
          Water Damage Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Water Source Identified?</Label>
          <RadioGroup
            value={formData.waterSourceIdentified}
            onValueChange={(value) => updateFormData({ waterSourceIdentified: value })}
          >
            {["Yes", "No", "Suspected"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`water-${option}`} />
                <Label htmlFor={`water-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label>Type of Water</Label>
          <RadioGroup
            value={formData.waterType}
            onValueChange={(value) => updateFormData({ waterType: value })}
          >
            {["Clean Water (Category 1)", "Grey Water (Category 2)", "Black Water (Category 3)"].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <RadioGroupItem value={type} id={type} />
                <Label htmlFor={type}>{type}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label>Description of Damage</Label>
          <Textarea
            value={formData.waterDamageDescription}
            onChange={(e) => updateFormData({ waterDamageDescription: e.target.value })}
            className="bg-background"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStructuralDamage = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Structural Damage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Structural Damage Present?</Label>
          <RadioGroup
            value={formData.structuralDamagePresent}
            onValueChange={(value) => updateFormData({ structuralDamagePresent: value })}
          >
            {["Yes", "No", "Unknown"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`struct-${option}`} />
                <Label htmlFor={`struct-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.structuralDescription}
            onChange={(e) => updateFormData({ structuralDescription: e.target.value })}
            className="bg-background"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderAffectedMaterials = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Affected Materials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          List all materials requiring removal or treatment
        </p>
        <Button variant="outline" className="w-full">
          + Add Material
        </Button>
        <div>
          <Label>Disposal Required?</Label>
          <RadioGroup
            value={formData.disposalRequired ? "Yes" : "No"}
            onValueChange={(value) => updateFormData({ disposalRequired: value === "Yes" })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="disposal-yes" />
              <Label htmlFor="disposal-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="disposal-no" />
              <Label htmlFor="disposal-no">No</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );

  const renderHealthSafety = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Health & Safety Concerns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Containment Required?</Label>
          <RadioGroup
            value={formData.containmentRequired ? "Yes" : "No"}
            onValueChange={(value) => updateFormData({ containmentRequired: value === "Yes" })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="contain-yes" />
              <Label htmlFor="contain-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="contain-no" />
              <Label htmlFor="contain-no">No</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label>Occupancy During Remediation</Label>
          <RadioGroup
            value={formData.occupancyDuringRemediation}
            onValueChange={(value) => updateFormData({ occupancyDuringRemediation: value })}
          >
            {["Vacate affected areas", "Full property evacuation", "Can remain with precautions"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label>Safety Recommendations</Label>
          <Textarea
            value={formData.safetyRecommendations}
            onChange={(e) => updateFormData({ safetyRecommendations: e.target.value })}
            className="bg-background"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderRemediationScope = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Remediation Scope
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Job Type * (determines base pricing)</Label>
          <RadioGroup
            value={formData.jobType}
            onValueChange={(value) => updateFormData({ jobType: value })}
          >
            {Object.keys(jobTypePricing).map((type) => {
              const pricing = jobTypePricing[type as keyof typeof jobTypePricing];
              return (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={type} />
                  <Label htmlFor={type} className="flex-1">
                    {type}
                    <span className="text-xs text-muted-foreground ml-2">
                      ${pricing.twoHour}/2h, ${pricing.eightHour}/8h
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
        <div>
          <Label>Detailed Scope of Work</Label>
          <Textarea
            value={formData.detailedScope}
            onChange={(e) => updateFormData({ detailedScope: e.target.value })}
            placeholder="1. Install containment barriers&#10;2. Set up negative air pressure..."
            className="bg-background"
            rows={8}
          />
        </div>
        <div>
          <Label>Special Considerations</Label>
          <Textarea
            value={formData.specialConsiderations}
            onChange={(e) => updateFormData({ specialConsiderations: e.target.value })}
            className="bg-background"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderEquipmentRequired = () => {
    const equipmentOptions = [
      { name: "Dehumidifier", dailyRate: 132 },
      { name: "Air Mover / Blower", dailyRate: 46 },
      { name: "RCD", dailyRate: 5 },
    ];

    const addEquipment = (name: string, dailyRate: number) => {
      const newEquipment = {
        name,
        dailyRate,
        quantity: 1,
        duration: 3,
        subtotal: dailyRate * 1 * 3,
      };
      updateFormData({ equipment: [...formData.equipment, newEquipment] });
    };

    const removeEquipment = (index: number) => {
      const newEquipment = formData.equipment.filter((_, i) => i !== index);
      updateFormData({ equipment: newEquipment });
    };

    const updateEquipmentItem = (index: number, field: string, value: number) => {
      const newEquipment = [...formData.equipment];
      newEquipment[index] = {
        ...newEquipment[index],
        [field]: value,
        subtotal: field === 'quantity' || field === 'duration' 
          ? (field === 'quantity' ? value : newEquipment[index].quantity) * 
            (field === 'duration' ? value : newEquipment[index].duration) * 
            newEquipment[index].dailyRate
          : newEquipment[index].subtotal
      };
      updateFormData({ equipment: newEquipment });
    };

    const totalEquipment = formData.equipment.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = totalEquipment * 0.1;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Equipment Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Daily rates (excluding GST)
          </p>

          {formData.equipment.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{item.name} - ${item.dailyRate}/day</h4>
                <Button variant="ghost" size="icon" onClick={() => removeEquipment(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateEquipmentItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.duration}
                    onChange={(e) => updateEquipmentItem(index, 'duration', parseInt(e.target.value) || 1)}
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs">Subtotal</Label>
                  <Input
                    value={`$${item.subtotal.toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            {equipmentOptions.map((option) => (
              <Button
                key={option.name}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addEquipment(option.name, option.dailyRate)}
              >
                + Add {option.name}
              </Button>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Total Equipment Cost (ex GST):</span>
              <span className="font-semibold">${totalEquipment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>GST (10%):</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total Equipment (inc GST):</span>
              <span>${(totalEquipment + gst).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <Label>Equipment Notes</Label>
            <Textarea
              value={formData.equipmentNotes}
              onChange={(e) => updateFormData({ equipmentNotes: e.target.value })}
              placeholder="e.g., 2x large dehumidifiers for bathroom..."
              className="bg-background"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCostCalculation = () => {
    const costs = calculateCosts();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">LABOR COST</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Job Type Selected:</span>
                <span className="font-semibold">{formData.jobType}</span>
              </div>
              <div>
                <Label>Estimated Duration (hours) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.estimatedDuration}
                  onChange={(e) => updateFormData({ estimatedDuration: parseInt(e.target.value) || 8 })}
                  className="bg-background mt-1"
                />
              </div>
              <div className="flex justify-between pt-2">
                <span>Base Labor Cost:</span>
                <span>${costs.laborCost.toFixed(2)}</span>
              </div>
              {costs.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Multi-day Discount:</span>
                  <span>-${costs.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Labor Subtotal (ex GST):</span>
                <span>${costs.laborAfterDiscount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">EQUIPMENT COST</h3>
            <div className="flex justify-between text-sm">
              <span>Equipment Subtotal (ex GST):</span>
              <span className="font-semibold">${costs.equipmentCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h3 className="font-semibold">ADDITIONAL COSTS</h3>
            <div>
              <Label>Material Costs</Label>
              <Input
                type="number"
                min="0"
                value={formData.materialCosts}
                onChange={(e) => updateFormData({ materialCosts: parseFloat(e.target.value) || 0 })}
                className="bg-background"
              />
            </div>
            <div>
              <Label>Disposal Fees</Label>
              <Input
                type="number"
                min="0"
                value={formData.disposalFees}
                onChange={(e) => updateFormData({ disposalFees: parseFloat(e.target.value) || 0 })}
                className="bg-background"
              />
            </div>
            <div>
              <Label>Other Costs</Label>
              <Input
                type="number"
                min="0"
                value={formData.otherCosts}
                onChange={(e) => updateFormData({ otherCosts: parseFloat(e.target.value) || 0 })}
                className="bg-background"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.additionalCostsDescription}
                onChange={(e) => updateFormData({ additionalCostsDescription: e.target.value })}
                placeholder="e.g., Replacement plasterboard and compound"
                className="bg-background"
              />
            </div>
          </div>

          <div className="border-2 border-primary rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-lg">QUOTE SUMMARY</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Labor Cost (ex GST):</span>
                <span>${costs.laborAfterDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Equipment Hire (ex GST):</span>
                <span>${costs.equipmentCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Materials (ex GST):</span>
                <span>${formData.materialCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Disposal (ex GST):</span>
                <span>${formData.disposalFees.toFixed(2)}</span>
              </div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between">
                <span>Subtotal (ex GST):</span>
                <span className="font-semibold">${costs.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (10%):</span>
                <span>${costs.gst.toFixed(2)}</span>
              </div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between text-lg font-bold" style={{ color: "#121D73" }}>
                <span>TOTAL (inc GST):</span>
                <span>${costs.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {costs.total > 5000 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                Total exceeds $5,000 - consider requiring deposit
              </p>
            </div>
          )}

          <div>
            <Label>Payment Terms</Label>
            <Select
              value={formData.paymentTerms}
              onValueChange={(value) => updateFormData({ paymentTerms: value })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="7 days from completion">7 days from completion</SelectItem>
                <SelectItem value="14 days from completion">14 days from completion</SelectItem>
                <SelectItem value="30 days from completion">30 days from completion</SelectItem>
                <SelectItem value="Payment on completion">Payment on completion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTimelineSchedule = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Timeline & Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Estimated Start Date *</Label>
          <Input
            type="date"
            value={formData.estimatedStartDate}
            onChange={(e) => updateFormData({ estimatedStartDate: e.target.value })}
            className="bg-background"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Job Duration (days)</Label>
            <Input
              type="number"
              min="1"
              value={formData.jobDuration}
              onChange={(e) => updateFormData({ jobDuration: parseInt(e.target.value) || 1 })}
              className="bg-background"
            />
          </div>
          <div>
            <Label>Drying Time (days)</Label>
            <Input
              type="number"
              min="0"
              value={formData.dryingTime}
              onChange={(e) => updateFormData({ dryingTime: parseInt(e.target.value) || 0 })}
              className="bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Work Start Time</Label>
            <Select
              value={formData.workStartTime}
              onValueChange={(value) => updateFormData({ workStartTime: value })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => (
                  <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                    {hour}:00 {hour < 12 ? 'AM' : 'PM'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Work Finish Time</Label>
            <Select
              value={formData.workFinishTime}
              onValueChange={(value) => updateFormData({ workFinishTime: value })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => (
                  <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                    {hour}:00 {hour < 12 ? 'AM' : 'PM'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Technician Assignment *</Label>
          <Select
            value={formData.technicianAssignment}
            onValueChange={(value) => updateFormData({ technicianAssignment: value })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="Sarah Martinez">Sarah Martinez</SelectItem>
              <SelectItem value="Michael Chen">Michael Chen</SelectItem>
              <SelectItem value="To be assigned">To be assigned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Client Availability Required?</Label>
          <RadioGroup
            value={formData.clientAvailabilityRequired}
            onValueChange={(value) => updateFormData({ clientAvailabilityRequired: value })}
          >
            {["Yes - Day 1 only", "Yes - All days", "No - Access provided"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label>Scheduling Notes</Label>
          <Textarea
            value={formData.schedulingNotes}
            onChange={(e) => updateFormData({ schedulingNotes: e.target.value })}
            placeholder="e.g., Client available for access Day 1..."
            className="bg-background"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderTechnicianNotes = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Technician Notes & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Inspection Summary</Label>
          <Textarea
            value={formData.inspectionSummary}
            onChange={(e) => updateFormData({ inspectionSummary: e.target.value })}
            placeholder="Auto-generated summary of key findings..."
            className="bg-background"
            rows={5}
          />
        </div>

        <div>
          <Label>Priority Level</Label>
          <RadioGroup
            value={formData.priorityLevel}
            onValueChange={(value) => updateFormData({ priorityLevel: value })}
          >
            {["High - Begin within 2-3 days", "Medium - Begin within 1 week", "Low - Begin within 2 weeks"].map((priority) => (
              <div key={priority} className="flex items-center space-x-2">
                <RadioGroupItem value={priority} id={priority} />
                <Label htmlFor={priority}>{priority}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label>Insurance Claim?</Label>
          <RadioGroup
            value={formData.insuranceClaim ? "Yes" : "No"}
            onValueChange={(value) => updateFormData({ insuranceClaim: value === "Yes" })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="insurance-yes" />
              <Label htmlFor="insurance-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="insurance-no" />
              <Label htmlFor="insurance-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.insuranceClaim && (
          <div className="space-y-3">
            <div>
              <Label>Insurer</Label>
              <Input
                value={formData.insurer || ""}
                onChange={(e) => updateFormData({ insurer: e.target.value })}
                className="bg-background"
              />
            </div>
            <div>
              <Label>Claim Number</Label>
              <Input
                value={formData.claimNumber || ""}
                onChange={(e) => updateFormData({ claimNumber: e.target.value })}
                className="bg-background"
              />
            </div>
          </div>
        )}

        <div>
          <Label>Internal Notes (not visible to client)</Label>
          <Textarea
            value={formData.internalNotes}
            onChange={(e) => updateFormData({ internalNotes: e.target.value })}
            placeholder="Easy access. Client very cooperative..."
            className="bg-background"
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );

  const currentSectionData = sections[currentSection - 1];
  const SectionIcon = currentSectionData.icon;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl md:text-2xl font-bold">Mobile Inspection Form</h1>
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
          {lastSaved && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Section {currentSection} of {sections.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="mt-2 flex items-center gap-2">
            <SectionIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{currentSectionData.title}</span>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-6">
        {renderSection()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={goToPreviousSection}
              disabled={currentSection === 1}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentSection < sections.length ? (
              <Button
                onClick={goToNextSection}
                style={{ backgroundColor: "#121D73", color: "white" }}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                style={{ backgroundColor: "#10B981", color: "white" }}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Inspection
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Completion Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Inspection Complete
            </DialogTitle>
            <DialogDescription>
              Review your inspection details before generating the report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Client:</span>
                <span className="text-sm font-semibold">{formData.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Property:</span>
                <span className="text-sm font-semibold">{formData.propertyAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Quote Total:</span>
                <span className="text-lg font-bold" style={{ color: "#121D73" }}>
                  ${calculateCosts().total.toFixed(2)} (inc GST)
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">What would you like to do next?</p>
              <div className="space-y-2">
                <Button
                  onClick={confirmComplete}
                  style={{ backgroundColor: "#121D73", color: "white" }}
                  className="w-full"
                >
                  Generate Report & Send Quote
                </Button>
                <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)} className="w-full">
                  Save as Draft
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
