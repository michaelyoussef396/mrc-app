import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Briefcase, Home, MapPin, Thermometer, Save, ChevronLeft, ChevronRight,
  Plus, X, Loader2, Upload, Check, Edit3, RefreshCw, Trash2
} from "lucide-react";

// Types
interface MoistureReading {
  id: string;
  title: string;
  moisturePercent: number;
  images: string[];
}

interface AreaInspection {
  id: string;
  areaName: string;
  mouldVisibility: string[];
  aiComments: string;
  aiApproved: boolean;
  temperature: number;
  humidity: number;
  dewPoint: number;
  moistureReadingsEnabled: boolean;
  moistureReadings: MoistureReading[];
  internalNotes: string;
  roomPhotos: string[];
  infraredEnabled: boolean;
  infraredPhoto: string;
  naturalLightPhoto: string;
  infraredObservations: string[];
  timeWithoutDemo: number;
  demoRequired: boolean;
  demoTime: number;
  demoDescription: string;
  demoAiApproved: boolean;
}

interface SubfloorReading {
  id: string;
  moisture: number;
  location: string;
}

interface Equipment {
  id: string;
  name: string;
  quantity: number;
  dailyRate: number;
  duration: number;
}

export default function InspectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Section 1: Job Information
  const [jobNumber] = useState("MRC-2025-0042");
  const [triage, setTriage] = useState("Bathroom mould after water leak");
  const [address, setAddress] = useState("45 High St, Croydon VIC 3136");
  const [inspector, setInspector] = useState("Sarah Martinez");
  const [requestedBy] = useState("John Smith");
  const [attentionTo, setAttentionTo] = useState("John Smith - Homeowner");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [propertyOccupation, setPropertyOccupation] = useState("");
  const [dwellingType, setDwellingType] = useState("");

  // Section 2: Area Inspections (repeatable)
  const [areas, setAreas] = useState<AreaInspection[]>([
    {
      id: "1",
      areaName: "",
      mouldVisibility: [],
      aiComments: "",
      aiApproved: false,
      temperature: 22,
      humidity: 65,
      dewPoint: 15,
      moistureReadingsEnabled: false,
      moistureReadings: [],
      internalNotes: "",
      roomPhotos: [],
      infraredEnabled: false,
      infraredPhoto: "",
      naturalLightPhoto: "",
      infraredObservations: [],
      timeWithoutDemo: 0,
      demoRequired: false,
      demoTime: 0,
      demoDescription: "",
      demoAiApproved: false,
    }
  ]);
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);

  // Section 3: Subfloor
  const [subfloorEnabled, setSubfloorEnabled] = useState(false);
  const [subfloorObservations, setSubfloorObservations] = useState("");
  const [subfloorAiComments, setSubfloorAiComments] = useState("");
  const [subfloorAiApproved, setSubfloorAiApproved] = useState(false);
  const [subfloorLandscape, setSubfloorLandscape] = useState("flat");
  const [subfloorReadings, setSubfloorReadings] = useState<SubfloorReading[]>([]);
  const [subfloorPhotos, setSubfloorPhotos] = useState<string[]>([]);
  const [subfloorSanitation, setSubfloorSanitation] = useState(false);
  const [subfloorRacking, setSubfloorRacking] = useState(false);
  const [subfloorTreatmentTime, setSubfloorTreatmentTime] = useState(0);

  // Section 4: Outdoor Information
  const [outdoorTemp, setOutdoorTemp] = useState(18);
  const [outdoorHumidity, setOutdoorHumidity] = useState(75);
  const [outdoorDewPoint, setOutdoorDewPoint] = useState(13);
  const [outdoorComments, setOutdoorComments] = useState("");
  const [frontDoorPhoto, setFrontDoorPhoto] = useState("");
  const [frontHousePhoto, setFrontHousePhoto] = useState("");
  const [mailboxPhoto, setMailboxPhoto] = useState("");
  const [streetPhoto, setStreetPhoto] = useState("");
  const [directionPhotosEnabled, setDirectionPhotosEnabled] = useState(false);
  const [directionPhotos, setDirectionPhotos] = useState<{id: string; caption: string; photo: string}[]>([]);

  // Section 5: Waste Disposal
  const [wasteDisposalEnabled, setWasteDisposalEnabled] = useState(false);
  const [wasteDisposalAmount, setWasteDisposalAmount] = useState("medium");

  // Section 6: Work Procedures
  const [hepaVac, setHepaVac] = useState(false);
  const [antimicrobial, setAntimicrobial] = useState(false);
  const [stainRemoving, setStainRemoving] = useState(false);
  const [homeSanitation, setHomeSanitation] = useState(false);
  const [dryingEquipmentEnabled, setDryingEquipmentEnabled] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // Section 7: Job Summary
  const [recommendDehumidifier, setRecommendDehumidifier] = useState(false);
  const [dehumidifierSize, setDehumidifierSize] = useState("medium");
  const [causeOfMould, setCauseOfMould] = useState("");
  const [causeAiApproved, setCauseAiApproved] = useState(false);
  const [additionalTechInfo, setAdditionalTechInfo] = useState("");
  const [additionalEquipmentComments, setAdditionalEquipmentComments] = useState("");
  const [parkingOptions, setParkingOptions] = useState("");

  // Section 8: Cost Calculation (auto-calculated)
  const [laborCost, setLaborCost] = useState(0);
  const [equipmentCost, setEquipmentCost] = useState(0);
  const [wasteDisposalCost, setWasteDisposalCost] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [gst, setGst] = useState(0);
  const [total, setTotal] = useState(0);

  // AI generation state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const sections = [
    { id: 1, title: "Job Information", icon: Briefcase },
    { id: 2, title: "Area Inspection", icon: Home },
    { id: 3, title: "Subfloor Section", icon: MapPin },
    { id: 4, title: "Outdoor Information", icon: Thermometer },
    { id: 5, title: "Waste Disposal", icon: Trash2 },
    { id: 6, title: "Work Procedures", icon: Check },
    { id: 7, title: "Job Summary", icon: Briefcase },
    { id: 8, title: "Cost Calculation", icon: Check },
  ];

  const totalSections = sections.length;
  const progress = (currentSection / totalSections) * 100;

  // Calculate dew point
  const calculateDewPoint = (temp: number, humidity: number): number => {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
    const dewPoint = (b * alpha) / (a - alpha);
    return Math.round(dewPoint * 10) / 10;
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleSaveProgress();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Update dew points when temp/humidity changes
  useEffect(() => {
    const currentArea = areas[currentAreaIndex];
    if (currentArea) {
      const newDewPoint = calculateDewPoint(currentArea.temperature, currentArea.humidity);
      updateArea(currentAreaIndex, { dewPoint: newDewPoint });
    }
  }, [areas[currentAreaIndex]?.temperature, areas[currentAreaIndex]?.humidity]);

  useEffect(() => {
    const newOutdoorDewPoint = calculateDewPoint(outdoorTemp, outdoorHumidity);
    setOutdoorDewPoint(newOutdoorDewPoint);
  }, [outdoorTemp, outdoorHumidity]);

  // Calculate costs whenever relevant data changes
  useEffect(() => {
    calculateCosts();
  }, [areas, subfloorTreatmentTime, equipment, wasteDisposalAmount, wasteDisposalEnabled]);

  const handleSaveProgress = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (files: string[]) => void) => {
    const files = e.target.files;
    if (files) {
      const fileUrls = Array.from(files).map(file => URL.createObjectURL(file));
      callback(fileUrls);
    }
  };

  const updateArea = (index: number, updates: Partial<AreaInspection>) => {
    setAreas(prev => prev.map((area, i) => i === index ? { ...area, ...updates } : area));
  };

  const addArea = () => {
    setAreas(prev => [...prev, {
      id: String(Date.now()),
      areaName: "",
      mouldVisibility: [],
      aiComments: "",
      aiApproved: false,
      temperature: 22,
      humidity: 65,
      dewPoint: 15,
      moistureReadingsEnabled: false,
      moistureReadings: [],
      internalNotes: "",
      roomPhotos: [],
      infraredEnabled: false,
      infraredPhoto: "",
      naturalLightPhoto: "",
      infraredObservations: [],
      timeWithoutDemo: 0,
      demoRequired: false,
      demoTime: 0,
      demoDescription: "",
      demoAiApproved: false,
    }]);
    setCurrentAreaIndex(areas.length);
  };

  const generateAiComments = async (context: string, areaData?: AreaInspection) => {
    setIsGeneratingAi(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGeneratingAi(false);
    
    // Return context-appropriate comments
    if (context === "area inspection") {
      return "The bathroom inspection revealed visible mould growth on the ceiling, cornice, walls, and grout/silicone areas. The affected surfaces show active growth with moisture present, indicating recent water intrusion. The mould appears to be Stachybotrys (black mould) based on visual assessment. Immediate remediation is recommended to prevent further spread and potential health impacts.";
    } else if (context === "demolition") {
      return "Ceiling Works:\n• Removal of affected plasterboard (2m² ceiling)\n• Removal of saturated ceiling insulation\n• Cutting and removal of water-damaged cornice\n\nWall Works:\n• Removal of ceramic tiles (1.5m²)\n• Removal of water-damaged wall lining behind tiles\n\nDisposal:\n• Containment and disposal of mould-affected materials\n• Waste removal to approved facility";
    } else if (context === "subfloor") {
      return "Subfloor inspection reveals elevated moisture levels beneath the bathroom area. Ventilation is inadequate with blocked vents observed. Soil moisture is present but no standing water detected. Timber joists show no visible mould growth but moisture readings indicate treatment required. Improved ventilation and vapor barrier installation recommended.";
    } else if (context === "cause") {
      return "The primary cause of mould growth in this property is water infiltration from a burst pipe in the ceiling cavity above the bathroom. The leak resulted in sustained moisture exposure over approximately 2 weeks, creating ideal conditions for mould colonization. Poor ventilation in the bathroom area contributed to moisture retention. The water source has been repaired by a licensed plumber, eliminating the ongoing moisture input. Secondary factors include inadequate bathroom exhaust and possible condensation issues during winter months.";
    }
    
    return "AI-generated professional comment based on inspection data...";
  };

  const calculateCosts = () => {
    // Calculate total time from all areas
    let totalMinutes = 0;
    areas.forEach(area => {
      totalMinutes += area.timeWithoutDemo;
      if (area.demoRequired) {
        totalMinutes += area.demoTime;
      }
    });
    
    if (subfloorEnabled) {
      totalMinutes += subfloorTreatmentTime;
    }

    const totalHours = Math.ceil(totalMinutes / 60);

    // Determine job type based on work required
    let jobType = "No Demolition";
    const hasDemo = areas.some(area => area.demoRequired);
    const hasSubfloor = subfloorEnabled;

    if (hasSubfloor) {
      jobType = "Subfloor"; // Highest tier
    } else if (hasDemo) {
      jobType = "Demo";
    }

    // Pricing structure
    const pricing = {
      "No Demolition": { "2h": 612.00, "8h": 1216.99 },
      "Demo": { "2h": 711.90, "8h": 1798.90 },
      "Construction": { "2h": 661.96, "8h": 1507.95 },
      "Subfloor": { "2h": 900.00, "8h": 2334.69 },
    };

    const rates = pricing[jobType as keyof typeof pricing];
    let labor = 0;

    if (totalHours <= 2) {
      labor = rates["2h"];
    } else if (totalHours <= 8) {
      labor = rates["8h"];
    } else if (totalHours <= 16) {
      labor = rates["8h"] * 2 * 0.925; // 7.5% discount
    } else {
      const days = Math.ceil(totalHours / 8);
      labor = rates["8h"] * days * 0.87; // 13% max discount
    }

    // Equipment costs
    const equipCost = equipment.reduce((sum, eq) => {
      return sum + (eq.quantity * eq.dailyRate * eq.duration);
    }, 0);

    // Waste disposal costs
    const wasteCosts = {
      small: 50,
      medium: 150,
      large: 300,
      "extra-large": 500,
    };
    const wasteCost = wasteDisposalEnabled ? wasteCosts[wasteDisposalAmount as keyof typeof wasteCosts] || 0 : 0;

    const sub = labor + equipCost + wasteCost;
    const gstAmount = sub * 0.1;
    const totalAmount = sub + gstAmount;

    setLaborCost(labor);
    setEquipmentCost(equipCost);
    setWasteDisposalCost(wasteCost);
    setSubtotal(sub);
    setGst(gstAmount);
    setTotal(totalAmount);
  };

  const nextSection = () => {
    if (currentSection < totalSections) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
  };

  const previousSection = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleComplete = () => {
    // Comprehensive validation
    const errors: string[] = [];
    
    // Section 1 validation
    if (!propertyOccupation) errors.push("Property Occupation (Section 1)");
    if (!dwellingType) errors.push("Dwelling Type (Section 1)");
    
    // Section 2 validation
    if (areas.length === 0) errors.push("At least one area inspection (Section 2)");
    areas.forEach((area, idx) => {
      if (!area.areaName) errors.push(`Area ${idx + 1}: Area Name (Section 2)`);
      if (area.roomPhotos.length < 3) errors.push(`Area ${idx + 1}: Need 3 room photos (currently ${area.roomPhotos.length}) (Section 2)`);
      if (area.timeWithoutDemo === 0) errors.push(`Area ${idx + 1}: Time for job required (Section 2)`);
      if (!area.aiApproved && area.aiComments) errors.push(`Area ${idx + 1}: Please approve AI comments (Section 2)`);
    });
    
    // Section 4 validation
    if (!frontDoorPhoto) errors.push("Front Door Photo (Section 4)");
    if (!frontHousePhoto) errors.push("Front of House Photo (Section 4)");
    if (!mailboxPhoto) errors.push("Mailbox Photo (Section 4)");
    if (!streetPhoto) errors.push("Street Photo (Section 4)");
    
    // Section 7 validation
    if (!parkingOptions) errors.push("Parking Options (Section 7)");
    
    if (errors.length > 0) {
      toast({
        title: "⚠️ Incomplete Inspection",
        description: (
          <div className="mt-2 space-y-1">
            <p className="font-semibold">Please complete the following:</p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              {errors.slice(0, 5).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
              {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
            </ul>
          </div>
        ),
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    toast({
      title: "✅ Inspection Complete!",
      description: "Report is being generated and will be sent to client with booking link",
      duration: 3000,
    });
    
    // Show completion modal with summary
    setTimeout(() => {
      toast({
        title: `📋 Report MRC-${jobNumber}`,
        description: `Total: $${total.toFixed(2)} (inc GST) for ${areas.length} area${areas.length > 1 ? 's' : ''}`,
      });
    }, 1000);
    
    // In real app: generate PDF, send email with booking link
    setTimeout(() => {
      navigate("/leads");
    }, 3000);
  };

  const currentArea = areas[currentAreaIndex];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mobile Inspection Form</h1>
              <p className="text-sm text-muted-foreground">Job #{jobNumber}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProgress}
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Save'}</>
              )}
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{sections[currentSection - 1].title}</span>
              <span className="text-muted-foreground">Section {currentSection} of {totalSections}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% Complete</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Section Progress Overview */}
        {currentSection >= 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Inspection Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sections.map((section) => {
                  const isComplete = section.id < currentSection;
                  const isCurrent = section.id === currentSection;
                  const SectionIcon = section.icon;
                  
                  return (
                    <div 
                      key={section.id}
                      className={`flex items-center gap-3 p-2 rounded ${
                        isCurrent ? 'bg-primary/10 border border-primary/20' : ''
                      }`}
                    >
                      {isComplete ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 text-primary animate-pulse" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <SectionIcon className={`h-4 w-4 ${isCurrent ? 'text-primary' : isComplete ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <span className={`text-sm ${isCurrent ? 'font-semibold' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                        {section.title}
                        {section.id === 2 && areas.length > 0 && ` (${areas.length} area${areas.length > 1 ? 's' : ''})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const SectionIcon = sections[currentSection - 1].icon;
                return <SectionIcon className="h-5 w-5" />;
              })()}
              {sections[currentSection - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Section 1: Job Information */}
            {currentSection === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Job Number</Label>
                  <Input value={jobNumber} disabled className="bg-muted" />
                </div>

                <div>
                  <Label>Triage - Job Description</Label>
                  <Textarea
                    value={triage}
                    onChange={(e) => setTriage(e.target.value)}
                    placeholder="Describe the issue"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Inspector</Label>
                  <Select value={inspector} onValueChange={setInspector}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sarah Martinez">Sarah Martinez</SelectItem>
                      <SelectItem value="Michael Chen">Michael Chen</SelectItem>
                      <SelectItem value="System Administrator">System Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Requested By</Label>
                  <Input value={requestedBy} disabled className="bg-muted" />
                </div>

                <div>
                  <Label>Attention To (Company or person)</Label>
                  <Input
                    value={attentionTo}
                    onChange={(e) => setAttentionTo(e.target.value)}
                    placeholder="e.g., John Smith - Homeowner"
                  />
                </div>

                <div>
                  <Label>Inspection Date</Label>
                  <Input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Property Occupation *</Label>
                  <Select value={propertyOccupation} onValueChange={setPropertyOccupation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupation status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenanted">Tenanted</SelectItem>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="owner-occupied">Owner Occupied</SelectItem>
                      <SelectItem value="tenants-vacating">Tenants Vacating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dwelling Type *</Label>
                  <Select value={dwellingType} onValueChange={setDwellingType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dwelling type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="units">Units</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="duplex">Duplex</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Section 2: Area Inspection */}
            {currentSection === 2 && currentArea && (
              <div className="space-y-6">
                {/* Areas Summary */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Areas Inspected: {areas.length}</h3>
                    <Button
                      onClick={addArea}
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4" /> Add Area
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {areas.map((area, idx) => {
                      const isComplete = area.areaName && area.roomPhotos.length >= 3 && area.timeWithoutDemo > 0;
                      return (
                        <div 
                          key={area.id} 
                          className={`flex items-center justify-between gap-2 bg-background px-3 py-2 rounded-md border-2 ${
                            idx === currentAreaIndex ? 'border-primary' : 'border-border'
                          }`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent flex-1 justify-start"
                            onClick={() => setCurrentAreaIndex(idx)}
                          >
                            <div className="flex items-center gap-2">
                              {isComplete ? (
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                              )}
                              <span className={idx === currentAreaIndex ? "font-bold" : ""}>
                                {area.areaName || `Area ${idx + 1}`}
                              </span>
                            </div>
                          </Button>
                          {areas.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Delete ${area.areaName || `Area ${idx + 1}`}?`)) {
                                  setAreas(prev => prev.filter((_, i) => i !== idx));
                                  if (currentAreaIndex >= idx && currentAreaIndex > 0) {
                                    setCurrentAreaIndex(currentAreaIndex - 1);
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Area {currentAreaIndex + 1} of {areas.length}</h3>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const isComplete = currentArea.areaName && currentArea.roomPhotos.length >= 3 && currentArea.timeWithoutDemo > 0;
                      return isComplete ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" /> Complete
                        </span>
                      ) : (
                        <span>In Progress</span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <Label>Area Name *</Label>
                  <Input
                    value={currentArea.areaName}
                    onChange={(e) => updateArea(currentAreaIndex, { areaName: e.target.value })}
                    placeholder="e.g., Bathroom, Living Room"
                  />
                </div>

                <div>
                  <Label>Mould Visibility (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {["Ceiling", "Cornice", "Windows", "Window Furnishings", "Walls", "Skirting", "Flooring", "Wardrobe", "Cupboard", "Contents", "Grout/Silicone", "No Mould Visible"].map((item) => (
                      <div key={item} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mould-${item}`}
                          checked={currentArea.mouldVisibility.includes(item)}
                          onCheckedChange={(checked) => {
                            const newVisibility = checked
                              ? [...currentArea.mouldVisibility, item]
                              : currentArea.mouldVisibility.filter(v => v !== item);
                            updateArea(currentAreaIndex, { mouldVisibility: newVisibility });
                          }}
                        />
                        <Label htmlFor={`mould-${item}`} className="font-normal">{item}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Comments Shown in Report</Label>
                    <Button
                      onClick={async () => {
                        const comment = await generateAiComments("area inspection", currentArea);
                        updateArea(currentAreaIndex, { aiComments: comment, aiApproved: false });
                      }}
                      disabled={isGeneratingAi}
                      size="sm"
                      variant="secondary"
                    >
                      {isGeneratingAi ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        "Generate with AI"
                      )}
                    </Button>
                  </div>
                  
                  <Textarea
                    value={currentArea.aiComments}
                    onChange={(e) => updateArea(currentAreaIndex, { aiComments: e.target.value })}
                    placeholder="AI will generate professional comments here..."
                    rows={6}
                  />

                  {currentArea.aiComments && !currentArea.aiApproved && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => updateArea(currentAreaIndex, { aiApproved: true })}
                      >
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const comment = await generateAiComments("area inspection", currentArea);
                          updateArea(currentAreaIndex, { aiComments: comment });
                        }}
                      >
                        <RefreshCw className="h-4 w-4" /> Regenerate
                      </Button>
                    </div>
                  )}

                  {currentArea.aiApproved && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      <span>Comments approved</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Temperature (°C)</Label>
                    <Input
                      type="number"
                      value={currentArea.temperature}
                      onChange={(e) => updateArea(currentAreaIndex, { temperature: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Humidity (%)</Label>
                    <Input
                      type="number"
                      value={currentArea.humidity}
                      onChange={(e) => updateArea(currentAreaIndex, { humidity: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Dew Point (°C)</Label>
                    <Input
                      type="number"
                      value={currentArea.dewPoint}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Moisture Readings</Label>
                  <Switch
                    checked={currentArea.moistureReadingsEnabled}
                    onCheckedChange={(checked) => updateArea(currentAreaIndex, { moistureReadingsEnabled: checked })}
                  />
                </div>

                {currentArea.moistureReadingsEnabled && (
                  <div className="space-y-4 pl-4 border-l-2">
                    {currentArea.moistureReadings.map((reading, idx) => (
                      <Card key={reading.id}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex justify-between">
                            <Label>Reading {idx + 1}</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newReadings = currentArea.moistureReadings.filter(r => r.id !== reading.id);
                                updateArea(currentAreaIndex, { moistureReadings: newReadings });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Title (e.g., Ceiling above shower)"
                            value={reading.title}
                            onChange={(e) => {
                              const newReadings = [...currentArea.moistureReadings];
                              newReadings[idx] = { ...reading, title: e.target.value };
                              updateArea(currentAreaIndex, { moistureReadings: newReadings });
                            }}
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Moisture %"
                              value={reading.moisturePercent}
                              onChange={(e) => {
                                const newReadings = [...currentArea.moistureReadings];
                                newReadings[idx] = { ...reading, moisturePercent: Number(e.target.value) };
                                updateArea(currentAreaIndex, { moistureReadings: newReadings });
                              }}
                            />
                            <div className="text-sm font-medium whitespace-nowrap self-center">
                              {reading.moisturePercent > 25 ? "🔴 VERY WET" :
                               reading.moisturePercent > 18 ? "⚠️ WET" :
                               reading.moisturePercent > 12 ? "⚠️ ELEVATED" : "✅ DRY"}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Attach from Photo Library</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleFileUpload(e, (files) => {
                                const newReadings = [...currentArea.moistureReadings];
                                newReadings[idx] = { ...reading, images: [...reading.images, ...files] };
                                updateArea(currentAreaIndex, { moistureReadings: newReadings });
                              })}
                              className="mt-1"
                            />
                            {reading.images.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                {reading.images.map((img, imgIdx) => (
                                  <div key={imgIdx} className="relative">
                                    <img src={img} alt={`Reading ${idx + 1} photo ${imgIdx + 1}`} className="w-full h-16 object-cover rounded" />
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="absolute top-0 right-0 h-5 w-5 p-0"
                                      onClick={() => {
                                        const newReadings = [...currentArea.moistureReadings];
                                        newReadings[idx] = {
                                          ...reading,
                                          images: reading.images.filter((_, i) => i !== imgIdx)
                                        };
                                        updateArea(currentAreaIndex, { moistureReadings: newReadings });
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newReading: MoistureReading = {
                          id: String(Date.now()),
                          title: "",
                          moisturePercent: 0,
                          images: [],
                        };
                        updateArea(currentAreaIndex, {
                          moistureReadings: [...currentArea.moistureReadings, newReading]
                        });
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add Moisture Reading
                    </Button>
                  </div>
                )}

                <div>
                  <Label>Internal Office Notes (Not visible in report)</Label>
                  <Textarea
                    value={currentArea.internalNotes}
                    onChange={(e) => updateArea(currentAreaIndex, { internalNotes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Room View (3 Photos required) *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(e, (files) => {
                      updateArea(currentAreaIndex, { roomPhotos: [...currentArea.roomPhotos, ...files] });
                    })}
                    className="mt-2"
                  />
                  {currentArea.roomPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {currentArea.roomPhotos.map((photo, idx) => (
                        <div key={idx} className="relative">
                          <img src={photo} alt={`Room ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => {
                              const newPhotos = currentArea.roomPhotos.filter((_, i) => i !== idx);
                              updateArea(currentAreaIndex, { roomPhotos: newPhotos });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentArea.roomPhotos.length} of 3 photos uploaded
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label>Infrared View</Label>
                  <Switch
                    checked={currentArea.infraredEnabled}
                    onCheckedChange={(checked) => updateArea(currentAreaIndex, { infraredEnabled: checked })}
                  />
                </div>

                {currentArea.infraredEnabled && (
                  <div className="space-y-4 pl-4 border-l-2">
                    <div>
                      <Label>Infrared Photo</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, (files) => {
                          updateArea(currentAreaIndex, { infraredPhoto: files[0] });
                        })}
                      />
                      {currentArea.infraredPhoto && (
                        <img src={currentArea.infraredPhoto} alt="Infrared" className="w-full h-32 object-cover rounded mt-2" />
                      )}
                    </div>
                    <div>
                      <Label>Natural Light Photo (same angle)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, (files) => {
                          updateArea(currentAreaIndex, { naturalLightPhoto: files[0] });
                        })}
                      />
                      {currentArea.naturalLightPhoto && (
                        <img src={currentArea.naturalLightPhoto} alt="Natural light" className="w-full h-32 object-cover rounded mt-2" />
                      )}
                    </div>
                    <div>
                      <Label>Infrared Observations</Label>
                      <div className="space-y-2 mt-2">
                        {["No active water infiltration detected", "Evidence of water infiltration present", "Indications of past water ingress", "Possible condensation-related thermal variations", "Suspected missing insulation detected"].map((obs) => (
                          <div key={obs} className="flex items-center space-x-2">
                            <Checkbox
                              id={`infrared-${obs}`}
                              checked={currentArea.infraredObservations.includes(obs)}
                              onCheckedChange={(checked) => {
                                const newObs = checked
                                  ? [...currentArea.infraredObservations, obs]
                                  : currentArea.infraredObservations.filter(o => o !== obs);
                                updateArea(currentAreaIndex, { infraredObservations: newObs });
                              }}
                            />
                            <Label htmlFor={`infrared-${obs}`} className="font-normal text-sm">{obs}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <Label>Time for Job (Without Demolition) *</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      type="number"
                      value={currentArea.timeWithoutDemo}
                      onChange={(e) => updateArea(currentAreaIndex, { timeWithoutDemo: Number(e.target.value) })}
                      placeholder="Minutes"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Is Demolition Required?</Label>
                  <Switch
                    checked={currentArea.demoRequired}
                    onCheckedChange={(checked) => updateArea(currentAreaIndex, { demoRequired: checked })}
                  />
                </div>

                {currentArea.demoRequired && (
                  <div className="space-y-4 pl-4 border-l-2">
                    <div>
                      <Label>Time for Demolition</Label>
                      <div className="flex gap-2 items-center mt-2">
                        <Input
                          type="number"
                          value={currentArea.demoTime}
                          onChange={(e) => updateArea(currentAreaIndex, { demoTime: Number(e.target.value) })}
                          placeholder="Minutes"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total time: {currentArea.timeWithoutDemo + currentArea.demoTime} minutes
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>What Demolition Required</Label>
                        <Button
                          onClick={async () => {
                            const description = await generateAiComments("demolition", currentArea);
                            updateArea(currentAreaIndex, { demoDescription: description, demoAiApproved: false });
                          }}
                          disabled={isGeneratingAi}
                          size="sm"
                          variant="secondary"
                        >
                          {isGeneratingAi ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                          ) : (
                            "Generate with AI"
                          )}
                        </Button>
                      </div>
                      <Textarea
                        value={currentArea.demoDescription}
                        onChange={(e) => updateArea(currentAreaIndex, { demoDescription: e.target.value })}
                        placeholder="AI will generate structured demolition list..."
                        rows={8}
                      />
                      
                      {currentArea.demoDescription && !currentArea.demoAiApproved && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => updateArea(currentAreaIndex, { demoAiApproved: true })}
                          >
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const description = await generateAiComments("demolition", currentArea);
                              updateArea(currentAreaIndex, { demoDescription: description });
                            }}
                          >
                            <RefreshCw className="h-4 w-4" /> Regenerate
                          </Button>
                        </div>
                      )}

                      {currentArea.demoAiApproved && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          <span>Demolition details approved</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator className="my-8" />

                {/* Area Navigation or Add New */}
                <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-r from-background to-accent/20">
                  <CardContent className="pt-6 pb-6 text-center space-y-4">
                    {currentAreaIndex < areas.length - 1 ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          ✅ Area {currentAreaIndex + 1} recorded
                        </p>
                        <Button
                          variant="default"
                          size="lg"
                          className="w-full sm:w-auto min-w-[200px]"
                          onClick={() => setCurrentAreaIndex(currentAreaIndex + 1)}
                        >
                          Continue to Next Area <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <p className="font-semibold text-lg">📋 Is there another area to inspect?</p>
                          <p className="text-sm text-muted-foreground">Add as many areas as you need (bedrooms, bathrooms, hallways, etc.)</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button
                            onClick={addArea}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 min-h-[50px] text-base"
                          >
                            <Plus className="h-5 w-5 mr-2" /> Yes - Add Another Area
                          </Button>
                          <Button
                            onClick={nextSection}
                            size="lg"
                            variant="outline"
                            className="min-h-[50px] text-base"
                          >
                            No - Continue to Subfloor Section <ChevronRight className="h-5 w-5 ml-2" />
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {areas.length > 1 && (
                  <div className="flex gap-2">
                    {currentAreaIndex > 0 && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCurrentAreaIndex(currentAreaIndex - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous Area
                      </Button>
                    )}
                    {currentAreaIndex < areas.length - 1 && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCurrentAreaIndex(currentAreaIndex + 1)}
                      >
                        Next Area <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Subfloor Section */}
            {currentSection === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Subfloor Inspection Required</Label>
                  <Switch
                    checked={subfloorEnabled}
                    onCheckedChange={setSubfloorEnabled}
                  />
                </div>

                {subfloorEnabled && (
                  <div className="space-y-6 pl-4 border-l-2">
                    <div>
                      <Label>Subfloor Observations (for AI)</Label>
                      <Textarea
                        value={subfloorObservations}
                        onChange={(e) => setSubfloorObservations(e.target.value)}
                        placeholder="Describe what you observe in the subfloor..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>AI-Generated Subfloor Comments</Label>
                        <Button
                          onClick={async () => {
                            const comment = await generateAiComments("subfloor");
                            setSubfloorAiComments(comment);
                            setSubfloorAiApproved(false);
                          }}
                          disabled={isGeneratingAi}
                          size="sm"
                          variant="secondary"
                        >
                          {isGeneratingAi ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                          ) : (
                            "Generate AI Report Text"
                          )}
                        </Button>
                      </div>
                      <Textarea
                        value={subfloorAiComments}
                        onChange={(e) => setSubfloorAiComments(e.target.value)}
                        placeholder="AI will generate professional subfloor comments..."
                        rows={6}
                      />
                      {subfloorAiComments && !subfloorAiApproved && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => setSubfloorAiApproved(true)}>
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const comment = await generateAiComments("subfloor");
                              setSubfloorAiComments(comment);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" /> Regenerate
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Subfloor Landscape</Label>
                      <Select value={subfloorLandscape} onValueChange={setSubfloorLandscape}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Block</SelectItem>
                          <SelectItem value="sloping">Sloping Block</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label>Subfloor Readings (Moisture %)</Label>
                      {subfloorReadings.map((reading, idx) => (
                        <Card key={reading.id}>
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex justify-between">
                              <Label>Reading {idx + 1}</Label>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSubfloorReadings(prev => prev.filter(r => r.id !== reading.id));
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              type="number"
                              placeholder="Moisture %"
                              value={reading.moisture}
                              onChange={(e) => {
                                const newReadings = [...subfloorReadings];
                                newReadings[idx] = { ...reading, moisture: Number(e.target.value) };
                                setSubfloorReadings(newReadings);
                              }}
                            />
                            <Input
                              placeholder="Location"
                              value={reading.location}
                              onChange={(e) => {
                                const newReadings = [...subfloorReadings];
                                newReadings[idx] = { ...reading, location: e.target.value };
                                setSubfloorReadings(newReadings);
                              }}
                            />
                          </CardContent>
                        </Card>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSubfloorReadings([...subfloorReadings, {
                            id: String(Date.now()),
                            moisture: 0,
                            location: ""
                          }]);
                        }}
                      >
                        <Plus className="h-4 w-4" /> Add Subfloor Reading
                      </Button>
                    </div>

                    <div>
                      <Label>Subfloor Photos (up to 20)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileUpload(e, (files) => {
                          setSubfloorPhotos(prev => [...prev, ...files]);
                        })}
                        className="mt-2"
                      />
                      {subfloorPhotos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {subfloorPhotos.map((photo, idx) => (
                            <div key={idx} className="relative">
                              <img src={photo} alt={`Subfloor ${idx + 1}`} className="w-full h-20 object-cover rounded" />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-0 right-0 h-5 w-5 p-0"
                                onClick={() => {
                                  setSubfloorPhotos(prev => prev.filter((_, i) => i !== idx));
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {subfloorPhotos.length} photos uploaded
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Subfloor Sanitation Required?</Label>
                      <Switch
                        checked={subfloorSanitation}
                        onCheckedChange={setSubfloorSanitation}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Subfloor Racking Required?</Label>
                      <Switch
                        checked={subfloorRacking}
                        onCheckedChange={setSubfloorRacking}
                      />
                    </div>

                    <div>
                      <Label>Subfloor Treatment Time (minutes)</Label>
                      <Input
                        type="number"
                        value={subfloorTreatmentTime}
                        onChange={(e) => setSubfloorTreatmentTime(Number(e.target.value))}
                        placeholder="Enter minutes"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Outdoor Information */}
            {currentSection === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Temperature (°C)</Label>
                    <Input
                      type="number"
                      value={outdoorTemp}
                      onChange={(e) => setOutdoorTemp(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Humidity (%)</Label>
                    <Input
                      type="number"
                      value={outdoorHumidity}
                      onChange={(e) => setOutdoorHumidity(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Dew Point (°C)</Label>
                    <Input
                      type="number"
                      value={outdoorDewPoint}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div>
                  <Label>Outdoor Comments</Label>
                  <Textarea
                    value={outdoorComments}
                    onChange={(e) => setOutdoorComments(e.target.value)}
                    placeholder="Describe outdoor conditions..."
                    rows={3}
                  />
                </div>

                <Separator />
                <h3 className="font-semibold">Property Identification Photos</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Front Door Photo *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, (files) => setFrontDoorPhoto(files[0]))}
                      className="mt-2"
                    />
                    {frontDoorPhoto && (
                      <img src={frontDoorPhoto} alt="Front door" className="w-full h-32 object-cover rounded mt-2" />
                    )}
                  </div>

                  <div>
                    <Label>Front of House Photo *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, (files) => setFrontHousePhoto(files[0]))}
                      className="mt-2"
                    />
                    {frontHousePhoto && (
                      <img src={frontHousePhoto} alt="Front of house" className="w-full h-32 object-cover rounded mt-2" />
                    )}
                  </div>

                  <div>
                    <Label>Mailbox Photo *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, (files) => setMailboxPhoto(files[0]))}
                      className="mt-2"
                    />
                    {mailboxPhoto && (
                      <img src={mailboxPhoto} alt="Mailbox" className="w-full h-32 object-cover rounded mt-2" />
                    )}
                  </div>

                  <div>
                    <Label>Street Photo *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, (files) => setStreetPhoto(files[0]))}
                      className="mt-2"
                    />
                    {streetPhoto && (
                      <img src={streetPhoto} alt="Street" className="w-full h-32 object-cover rounded mt-2" />
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label>Include Navigation Photos</Label>
                  <Switch
                    checked={directionPhotosEnabled}
                    onCheckedChange={setDirectionPhotosEnabled}
                  />
                </div>

                {directionPhotosEnabled && (
                  <div className="space-y-4 pl-4 border-l-2">
                    {directionPhotos.map((dir, idx) => (
                      <Card key={dir.id}>
                        <CardContent className="pt-4 space-y-3">
                          <Input
                            placeholder="Caption (e.g., Turn left at traffic lights)"
                            value={dir.caption}
                            onChange={(e) => {
                              const newPhotos = [...directionPhotos];
                              newPhotos[idx] = { ...dir, caption: e.target.value };
                              setDirectionPhotos(newPhotos);
                            }}
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, (files) => {
                              const newPhotos = [...directionPhotos];
                              newPhotos[idx] = { ...dir, photo: files[0] };
                              setDirectionPhotos(newPhotos);
                            })}
                          />
                          {dir.photo && (
                            <img src={dir.photo} alt="Direction" className="w-full h-24 object-cover rounded" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDirectionPhotos([...directionPhotos, {
                          id: String(Date.now()),
                          caption: "",
                          photo: ""
                        }]);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add More Direction Photos
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Section 5: Waste Disposal */}
            {currentSection === 5 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Waste Disposal Required</Label>
                  <Switch
                    checked={wasteDisposalEnabled}
                    onCheckedChange={setWasteDisposalEnabled}
                  />
                </div>

                {wasteDisposalEnabled && (
                  <div>
                    <Label>Waste Disposal Amount *</Label>
                    <Select value={wasteDisposalAmount} onValueChange={setWasteDisposalAmount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (Disposal bags)</SelectItem>
                        <SelectItem value="medium">Medium (Fill van)</SelectItem>
                        <SelectItem value="large">Large (Fill 2 vans)</SelectItem>
                        <SelectItem value="extra-large">Extra Large (Fill skip)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Cost will be calculated automatically based on selection
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Section 6: Work Procedures */}
            {currentSection === 6 && (
              <div className="space-y-6">
                <div>
                  <Label>Select all procedures required:</Label>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="hepa" checked={hepaVac} onCheckedChange={(checked) => setHepaVac(!!checked)} />
                      <Label htmlFor="hepa" className="font-normal">HEPA VAC</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="antimicrobial" checked={antimicrobial} onCheckedChange={(checked) => setAntimicrobial(!!checked)} />
                      <Label htmlFor="antimicrobial" className="font-normal">Antimicrobial Treatment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="stain" checked={stainRemoving} onCheckedChange={(checked) => setStainRemoving(!!checked)} />
                      <Label htmlFor="stain" className="font-normal">Stain Removing Antimicrobial</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="sanitation" checked={homeSanitation} onCheckedChange={(checked) => setHomeSanitation(!!checked)} />
                      <Label htmlFor="sanitation" className="font-normal">Home Sanitation and Fogging</Label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Drying Equipment Required?</Label>
                  <Switch
                    checked={dryingEquipmentEnabled}
                    onCheckedChange={setDryingEquipmentEnabled}
                  />
                </div>

                {dryingEquipmentEnabled && (
                  <div className="space-y-6 pl-4 border-l-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEquipment([...equipment, {
                          id: String(Date.now()),
                          name: "Commercial Dehumidifier",
                          quantity: 1,
                          dailyRate: 132,
                          duration: 3
                        }]);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add Equipment
                    </Button>

                    {equipment.map((eq, idx) => (
                      <Card key={eq.id}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>Equipment {idx + 1}</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEquipment(prev => prev.filter(e => e.id !== eq.id));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Select
                            value={eq.name}
                            onValueChange={(value) => {
                              const rates: Record<string, number> = {
                                "Commercial Dehumidifier": 132,
                                "Air Mover": 46,
                                "RCD Box": 5
                              };
                              const newEquipment = [...equipment];
                              newEquipment[idx] = { ...eq, name: value, dailyRate: rates[value] || 0 };
                              setEquipment(newEquipment);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Commercial Dehumidifier">Commercial Dehumidifier ($132/day)</SelectItem>
                              <SelectItem value="Air Mover">Air Mover ($46/day)</SelectItem>
                              <SelectItem value="RCD Box">RCD Box ($5/day)</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                value={eq.quantity}
                                onChange={(e) => {
                                  const newEquipment = [...equipment];
                                  newEquipment[idx] = { ...eq, quantity: Number(e.target.value) };
                                  setEquipment(newEquipment);
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Duration (days)</Label>
                              <Input
                                type="number"
                                value={eq.duration}
                                onChange={(e) => {
                                  const newEquipment = [...equipment];
                                  newEquipment[idx] = { ...eq, duration: Number(e.target.value) };
                                  setEquipment(newEquipment);
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Cost: ${(eq.quantity * eq.dailyRate * eq.duration).toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}

                    <div className="bg-muted p-4 rounded-lg">
                      <p className="font-semibold">Total Equipment Cost: ${equipmentCost.toFixed(2)} (ex GST)</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 7: Job Summary */}
            {currentSection === 7 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Recommend Dehumidifier for Client?</Label>
                  <Switch
                    checked={recommendDehumidifier}
                    onCheckedChange={setRecommendDehumidifier}
                  />
                </div>

                {recommendDehumidifier && (
                  <div>
                    <Label>Recommendation Size</Label>
                    <Select value={dehumidifierSize} onValueChange={setDehumidifierSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (1x Dehumidifier)</SelectItem>
                        <SelectItem value="medium">Medium (2x Dehumidifier)</SelectItem>
                        <SelectItem value="large">Large (Home Built-in Dehumidifier)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Cause of Mould (AI Generated)</Label>
                    <Button
                      onClick={async () => {
                        const cause = await generateAiComments("cause");
                        setCauseOfMould(cause);
                        setCauseAiApproved(false);
                      }}
                      disabled={isGeneratingAi}
                      size="sm"
                      variant="secondary"
                    >
                      {isGeneratingAi ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        "Generate with AI"
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={causeOfMould}
                    onChange={(e) => setCauseOfMould(e.target.value)}
                    placeholder="AI will analyze the entire inspection and generate cause analysis..."
                    rows={8}
                  />
                  {causeOfMould && !causeAiApproved && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => setCauseAiApproved(true)}>
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const cause = await generateAiComments("cause");
                          setCauseOfMould(cause);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" /> Regenerate
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Additional Information for Technician</Label>
                  <Textarea
                    value={additionalTechInfo}
                    onChange={(e) => setAdditionalTechInfo(e.target.value)}
                    placeholder="Client availability, access notes, special instructions..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Additional Equipment Comments</Label>
                  <Textarea
                    value={additionalEquipmentComments}
                    onChange={(e) => setAdditionalEquipmentComments(e.target.value)}
                    placeholder="Equipment requirements, access considerations..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Parking Options *</Label>
                  <Select value={parkingOptions} onValueChange={setParkingOptions}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parking option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driveway">Driveway</SelectItem>
                      <SelectItem value="street">Street</SelectItem>
                      <SelectItem value="carpark">Carpark</SelectItem>
                      <SelectItem value="visitor">Visitor Carpark</SelectItem>
                      <SelectItem value="none">No Nearby Parking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Section 8: Cost Calculation */}
            {currentSection === 8 && (
              <div className="space-y-6">
                {/* Time Breakdown */}
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="text-base">Total Time Calculation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {areas.map((area, idx) => (
                      <div key={area.id} className="space-y-1">
                        <div className="font-medium">Area {idx + 1}: {area.areaName || "Unnamed"}</div>
                        <div className="text-sm text-muted-foreground pl-4">
                          <div>• Job time: {area.timeWithoutDemo} mins</div>
                          {area.demoRequired && <div>• Demo time: {area.demoTime} mins</div>}
                          <div className="font-semibold">• Subtotal: {area.timeWithoutDemo + (area.demoRequired ? area.demoTime : 0)} mins</div>
                        </div>
                      </div>
                    ))}
                    {subfloorEnabled && (
                      <div className="space-y-1">
                        <div className="font-medium">Subfloor Treatment: {subfloorTreatmentTime} mins</div>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>TOTAL TIME:</span>
                      <span>
                        {(() => {
                          let total = 0;
                          areas.forEach(a => {
                            total += a.timeWithoutDemo + (a.demoRequired ? a.demoTime : 0);
                          });
                          if (subfloorEnabled) total += subfloorTreatmentTime;
                          const hours = Math.ceil(total / 60);
                          return `${total} minutes = ${(total / 60).toFixed(2)} hours (Rounded to ${hours} hour${hours > 1 ? 's' : ''})`;
                        })()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Job Type Determination</Label>
                  <Card className="bg-accent/50">
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={subfloorEnabled ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                          {subfloorEnabled ? "✓" : "○"} Subfloor work
                        </span>
                        {subfloorEnabled && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Highest tier - $2,334.69/8h</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={areas.some(a => a.demoRequired) ? "text-blue-600 font-semibold" : "text-muted-foreground"}>
                          {areas.some(a => a.demoRequired) ? "✓" : "○"} Demolition work
                        </span>
                        {areas.some(a => a.demoRequired) && !subfloorEnabled && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">$1,798.90/8h</span>}
                      </div>
                      <div className="text-muted-foreground">○ Construction work</div>
                      <div className="text-muted-foreground">○ Surface treatment only</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quote Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Labor Costs:</div>
                          <div className="text-sm text-muted-foreground">
                            {(() => {
                              let total = 0;
                              areas.forEach(a => {
                                total += a.timeWithoutDemo + (a.demoRequired ? a.demoTime : 0);
                              });
                              if (subfloorEnabled) total += subfloorTreatmentTime;
                              const hours = Math.ceil(total / 60);
                              const jobType = subfloorEnabled ? "Subfloor" : areas.some(a => a.demoRequired) ? "Demo" : "No Demolition";
                              return `${jobType} (${hours} hours)`;
                            })()}
                          </div>
                        </div>
                        <span className="font-semibold text-lg">${laborCost.toFixed(2)}</span>
                      </div>

                      {equipment.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <div className="font-medium mb-2">Equipment Hire:</div>
                            <div className="space-y-1 pl-4">
                              {equipment.map((eq, idx) => (
                                <div key={eq.id} className="flex justify-between text-sm">
                                  <span>{eq.quantity}x {eq.name} ({eq.duration} days)</span>
                                  <span>${(eq.quantity * eq.dailyRate * eq.duration).toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between font-semibold text-sm pt-1">
                                <span>Equipment Subtotal:</span>
                                <span>${equipmentCost.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {wasteDisposalEnabled && (
                        <>
                          <Separator />
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium">Waste Disposal:</div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {wasteDisposalAmount.replace("-", " ")}
                              </div>
                            </div>
                            <span className="font-semibold">${wasteDisposalCost.toFixed(2)}</span>
                          </div>
                        </>
                      )}

                      <Separator className="my-4" />
                      
                      <div className="flex justify-between text-lg">
                        <span>Subtotal (ex GST):</span>
                        <span className="font-semibold">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST (10%):</span>
                        <span>${gst.toFixed(2)}</span>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="flex justify-between text-2xl font-bold">
                        <span>TOTAL (inc GST):</span>
                        <span className="text-primary">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-accent/30 p-4 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Quote Valid:</span>
                        <span className="font-medium">30 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Terms:</span>
                        <span className="font-medium">14 days from completion</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleComplete} 
                  size="lg" 
                  className="w-full h-14 text-lg"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Complete Inspection & Generate Report
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6 gap-4">
          <Button
            onClick={previousSection}
            disabled={currentSection === 1}
            variant="outline"
            size="lg"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          
          {currentSection < totalSections ? (
            <Button
              onClick={nextSection}
              size="lg"
            >
              Next Section <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              size="lg"
            >
              Complete Inspection
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
