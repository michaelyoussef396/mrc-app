// Type definitions for inspection form

export interface MoistureReading {
  id: string;
  title: string;
  reading: string;
  photo: Photo | null;  // Changed from images: Photo[] to single photo
}

export interface Photo {
  id: string;
  name: string;
  url: string;
  timestamp: string;
}

export interface InspectionArea {
  id: string;
  areaName: string;
  mouldDescription: string;
  commentsForReport: string;
  temperature: string;
  humidity: string;
  dewPoint: string;
  moistureReadingsEnabled: boolean;
  moistureReadings: MoistureReading[];
  externalMoisture: string;
  internalNotes: string;
  roomViewPhotos: Photo[];
  infraredEnabled: boolean;
  infraredPhoto: Photo | null;
  naturalInfraredPhoto: Photo | null;
  infraredObservations: string[];
  timeWithoutDemo: number;
  demolitionRequired: boolean;
  demolitionTime: number;
  demolitionDescription: string;
}

export interface SubfloorReading {
  id: string;
  reading: string;
  location: string;
}

export interface InspectionFormData {
  // Section 1: Basic Information
  jobNumber: string;
  triage: string;
  address: string;
  inspector: string;
  requestedBy: string;
  attentionTo: string;
  inspectionDate: string;

  // Section 2: Property Details
  propertyOccupation: string;
  dwellingType: string;

  // Section 3: Area Inspections (repeatable)
  areas: InspectionArea[];

  // Section 4: Subfloor
  subfloorEnabled: boolean;
  subfloorObservations: string;
  subfloorLandscape: string;
  subfloorComments: string;
  subfloorReadings: SubfloorReading[];
  subfloorPhotos: Photo[];
  subfloorSanitation: boolean;
  subfloorRacking: boolean;
  subfloorTreatmentTime: number;

  // Section 5: Outdoor Information
  outdoorTemperature: string;
  outdoorHumidity: string;
  outdoorDewPoint: string;
  outdoorComments: string;
  frontDoorPhoto: Photo | null;
  frontHousePhoto: Photo | null;
  mailboxPhoto: Photo | null;
  streetPhoto: Photo | null;
  directionPhotosEnabled: boolean;
  directionPhoto: Photo | null;

  // Section 6: Waste Disposal
  wasteDisposalEnabled: boolean;
  wasteDisposalAmount: string;

  // Section 7: Work Procedure
  hepaVac: boolean;
  antimicrobial: boolean;
  stainRemovingAntimicrobial: boolean;
  homeSanitationFogging: boolean;
  dryingEquipmentEnabled: boolean;
  commercialDehumidifierEnabled: boolean;
  commercialDehumidifierQty: number;
  airMoversEnabled: boolean;
  airMoversQty: number;
  rcdBoxEnabled: boolean;
  rcdBoxQty: number;

  // Section 8: Job Summary
  recommendDehumidifier: boolean;
  dehumidifierSize: string;
  causeOfMould: string;
  additionalInfoForTech: string;
  additionalEquipmentComments: string;
  parkingOptions: string;

  // Section 9: Cost Estimate - Australian Tier Pricing Model
  // Labour Hours (editable inputs - 3 job types)
  noDemolitionHours: number;   // Non-Demolition labour hours
  demolitionHours: number;     // Demolition labour hours
  subfloorHours: number;       // Subfloor labour hours

  // Equipment Cost (direct entry - not qty × rate × days)
  equipmentCost: number;       // Total equipment cost ex GST

  // Manual Override
  manualPriceOverride: boolean;
  manualTotal: number;         // Manual total inc GST

  // Calculated Values (auto-calculated from tier pricing)
  // Labour uses tier interpolation: 2h=$X, 8h=$Y with linear interpolation
  laborCost: number;           // Labour cost after discount (ex GST)
  discountPercent: number;     // Volume discount (0%, 7.5%, 10.25%, 11.5%, 13% max)
  subtotalExGst: number;       // Labour after discount + Equipment
  gstAmount: number;           // GST at 10%
  totalIncGst: number;         // Final total including GST

  // AI Summary
  jobSummaryFinal: string;
  regenerationFeedback: string;

  // PDF Section Fields (AI-generated)
  whatWeFoundText: string;
  whatWeWillDoText: string;
  whatYouGetText: string;
  problemAnalysisContent: string;
  demolitionContent: string;

}
