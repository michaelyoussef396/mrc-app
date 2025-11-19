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
  mouldVisibility: string[];
  commentsForReport: string;
  temperature: string;
  humidity: string;
  dewPoint: string;
  moistureReadingsEnabled: boolean;
  moistureReadings: MoistureReading[];
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
  directionPhotos: Photo[];

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

  // Section 9: Cost Calculation (auto-calculated)
  estimatedDays: number;
  laborCost: number;
  equipmentCost: number;
  subtotal: number;
  gst: number;
  totalCost: number;
}
