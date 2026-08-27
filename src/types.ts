export type TargetCountry = string;

export interface KeywordResults {
  englishCore: string;
  localCore: string;
  exactProduct: string[];
  specialty: string[];
  distributorImporter: string[];
  competitorBrand: string[];
  localLanguage: string[];
  exhibition: string[];
  tender: string[];
}

export interface Lead {
  id: string;
  companyName: string;
  country: TargetCountry;
  category: "Distributor" | "Hospital" | "Clinic" | "Trader" | "Wholesaler" | "Importer" | "Manufacturer" | "Agent" | "Retailer";
  website: string;
  phone: string;
  email: string;
  contactPerson: string;
  position: string;
  source: string;
  status: "New" | "Contacted" | "Qualified" | "Disqualified" | "In CRM";
  rating?: number;
  nextFollowUp?: string;
  notes?: string;
  scrapedAt?: string;
  linkedinUrl?: string;
  seoRank?: number;
  establishedYear?: number;
  specialty?: string;
  websiteStatus?: "active" | "unreachable" | "parked" | "redirected" | "outdated" | "unknown";
  companyType?: "specialized distributor" | "general medical webshop" | "emergency/rescue supplier" | "anesthesia/ICU distributor" | "endoscopy distributor" | "manufacturer/OEM" | "clinic/hospital/training center" | "consumer health brand" | "irrelevant/unknown";
  mainBusinessSummary?: string;
  relevantKeywordsFound?: string[];
  evidenceUrls?: string[];
  productLineStatus?: "active" | "weak evidence" | "possible historical" | "not found";
  videoLaryngoscopeFit?: number;
  bronchoscopeFit?: number;
  entEndoscopeFit?: number;
  disposableScopeFit?: number;
  recommendedProductToPitch?: string;
  leadPriority?: "A" | "B" | "C" | "D";
  confidenceScore?: number;
  nextAction?: "email_now" | "find_person_on_linkedin" | "whatsapp_once" | "verify_first" | "skip";
  reason?: string;
}

export interface SearchState {
  isSearching: boolean;
  progress: number;
  log: string[];
}
