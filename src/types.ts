export type TargetCountry = string;

export interface KeywordResults {
  englishCore: string;
  localCore: string;
  google: string[];
  alibaba: string[];
  amazon: string[];
  localTerms: string[];
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
  status: "New" | "Contacted" | "Qualified" | "Disqualified";
  rating?: number;
  nextFollowUp?: string;
  notes?: string;
  scrapedAt?: string;
  linkedinUrl?: string;
  seoRank?: number;
  establishedYear?: number;
}

export interface SearchState {
  isSearching: boolean;
  progress: number; // 0 to 100
  log: string[];
}
