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
    // Validate required fields
    if (!propertyOccupation || !dwellingType) {
      toast({
        title: "Required fields missing",
        description: "Please complete all required fields before submitting",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Inspection Complete!",
      description: "Report will be generated and sent to client",
    });
    
    // In real app: generate PDF, send email with booking link
    setTimeout(() => {
      navigate("/calendar");
    }, 2000);
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Area {currentAreaIndex + 1} of {areas.length}</h3>
                  <Button onClick={addArea} variant="outline" size="sm">
                    <Plus className="h-4 w-4" /> Add Another Area
                  </Button>
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

            {/* Sections 3-8: Placeholder */}
            {currentSection > 2 && currentSection < 8 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Section {currentSection}: {sections[currentSection - 1].title}</p>
                <p className="text-sm text-muted-foreground">Additional sections will be implemented based on specifications</p>
              </div>
            )}

            {/* Section 8: Cost Calculation */}
            {currentSection === 8 && (
              <div className="space-y-6">
                <div className="bg-muted p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold text-lg">Cost Breakdown</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Labor Cost:</span>
                      <span className="font-semibold">${laborCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Equipment Hire:</span>
                      <span className="font-semibold">${equipmentCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Waste Disposal:</span>
                      <span className="font-semibold">${wasteDisposalCost.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Subtotal (ex GST):</span>
                      <span className="font-semibold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GST (10%):</span>
                      <span>${gst.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL (inc GST):</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Quote Valid: 30 days | Payment Terms: 14 days from completion
                  </p>
                </div>

                <Button onClick={handleComplete} size="lg" className="w-full">
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
