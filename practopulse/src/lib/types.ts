export type ProductFit = "REACH" | "PRIME" | "HYBRID";
export type LeadStatus =
  | "NEW"
  | "ENRICHED"
  | "OUTREACH_ACTIVE"
  | "DEMO_SCHEDULED"
  | "CLOSED_WON";

export type PractoProfileStatus =
  | "Unclaimed"
  | "Non-Prime"
  | "Ray User"
  | "Reach Active"
  | "Prime Active";

export interface PractoLead {
  id: string;
  doctorName: string;
  clinicName: string;
  specialty: string;
  city: string;
  locality: string;
  address: string;
  phone: string;
  email: string;
  googleRating: number;
  reviewCount: number;
  practoProfileStatus: PractoProfileStatus;
  recommendedProduct: ProductFit;
  status: LeadStatus;
  leadScore: number;
  pitchHook?: string;
  pitchDeckUrl?: string;
  firefliesSummary?: string;
  decisionMaker?: string;
  createdAt: string;
}

export interface LeadFilterState {
  city: string;
  locality: string;
  specialties: string[];
  product: "REACH" | "PRIME" | "BOTH";
}

export interface IntegrationSettings {
  APIFY_API_KEY: string;
  CLAY_API_KEY: string;
  SMARTLEAD_API_KEY: string;
  HEYREACH_API_KEY: string;
  N8N_WEBHOOK_URL: string;
  ANTHROPIC_API_KEY: string;
  GAMMA_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  FIREFLIES_API_KEY: string;
  NOTION_API_KEY: string;
  GOOGLE_CALENDAR_CLIENT_ID: string;
  WISPR_ENABLED: boolean;
}

export const INDIAN_CITIES = [
  "Bangalore",
  "Mumbai",
  "Delhi-NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
] as const;

export const MEDICAL_SPECIALTIES = [
  "Dermatologist",
  "Dentist",
  "Orthopedist",
  "Pediatrician",
  "Gynecologist",
  "ENT",
  "General Physician",
  "Cardiologist",
  "Ophthalmologist",
] as const;
