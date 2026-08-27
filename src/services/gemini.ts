import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  try {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
        console.warn("AI Init: GEMINI_API_KEY is not defined in process.env.");
        return null;
      }
      aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
  } catch (e) {
    console.error("AI Initialization Critical Fail:", e);
    return null;
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithFallback(ai: any, params: any) {
  const models = ["gemini-flash-latest", "gemini-3.1-flash-lite-preview", "gemini-3-flash-preview", "gemini-3.1-pro-preview"];
  let lastError: any = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      console.log(`[AI Logic] Attempting operation with model: ${model}`);
      return await ai.models.generateContent({ ...params, model });
    } catch (err: any) {
      lastError = err;
      const errorString = JSON.stringify(err).toLowerCase();
      const isOverloaded = errorString.includes("503") || errorString.includes("unavailable") || errorString.includes("high demand");
      const isQuotaExceeded = errorString.includes("429") || errorString.includes("quota") || errorString.includes("exhausted");
      if (isOverloaded || isQuotaExceeded) {
        console.warn(`[AI Logic] ${model} unavailable/quota-limited; trying fallback.`);
        if (isOverloaded) await sleep(1500);
        continue;
      }
      if (params.config?.tools && i === models.length - 1) {
        try {
          const configWithoutTools = { ...params.config };
          delete configWithoutTools.tools;
          return await ai.models.generateContent({ ...params, model: "gemini-flash-latest", config: configWithoutTools });
        } catch (innerErr) {
          throw innerErr;
        }
      }
      throw err;
    }
  }
  throw lastError;
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return "";
  try { return new URL(url).toString(); } catch { return ""; }
}

function normalizeName(name: unknown): string {
  return String(name || "").toLowerCase()
    .replace(/sp\s*\.?\s*z\s*\.?\s*o\s*\.?\s*o\s*\.?/g, " ")
    .replace(/sp\s*\.?\s*k\s*\.?/g, " ").replace(/s\s*\.?\s*a\s*\.?/g, " ")
    .replace(/gmbh|limited|ltd|incorporated|inc\.?/g, " ")
    .replace(/[^a-z0-9\p{L}]/gu, "").trim();
}

export function isRealNonSyntheticCompany(lead: any): boolean {
  if (!lead?.companyName) return false;
  const name = String(lead.companyName).trim();
  const lower = name.toLowerCase();
  const website = normalizeUrl(lead.website);
  if (!website) return false;
  if (/example\.com|dummy\.com|test\.com|localhost|synthesized/i.test(website)) return false;
  if (/dummy|synthetic|sample ltd|test company|industry partner/i.test(lower)) return false;
  if (/\b[a-z-]+\s+\d{1,3}\b/i.test(name) && !/\b(18|19|20)\d{2}\b/.test(name)) return false;
  return true;
}

const leadSchema = {
  type: Type.ARRAY,
  items: { type: Type.OBJECT, properties: {
    companyName: { type: Type.STRING }, website: { type: Type.STRING },
    websiteStatus: { type: Type.STRING, enum: ["active", "unreachable", "parked", "redirected", "outdated", "unknown"] },
    companyType: { type: Type.STRING, enum: ["specialized distributor", "general medical webshop", "emergency/rescue supplier", "anesthesia/ICU distributor", "endoscopy distributor", "manufacturer/OEM", "clinic/hospital/training center", "consumer health brand", "irrelevant/unknown"] },
    category: { type: Type.STRING, enum: ["Wholesaler", "Distributor", "Importer", "Manufacturer", "Agent", "Retailer"] },
    mainBusinessSummary: { type: Type.STRING }, relevantKeywordsFound: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceUrls: { type: Type.ARRAY, items: { type: Type.STRING } },
    productLineStatus: { type: Type.STRING, enum: ["active", "weak evidence", "possible historical", "not found"] },
    videoLaryngoscopeFit: { type: Type.INTEGER }, bronchoscopeFit: { type: Type.INTEGER }, entEndoscopeFit: { type: Type.INTEGER }, disposableScopeFit: { type: Type.INTEGER },
    recommendedProductToPitch: { type: Type.STRING }, leadPriority: { type: Type.STRING, enum: ["A", "B", "C", "D"] }, confidenceScore: { type: Type.INTEGER },
    nextAction: { type: Type.STRING, enum: ["email_now", "find_person_on_linkedin", "whatsapp_once", "verify_first", "skip"] }, reason: { type: Type.STRING },
    email: { type: Type.STRING }, phone: { type: Type.STRING }, linkedinUrl: { type: Type.STRING }, specialty: { type: Type.STRING }, seoRank: { type: Type.NUMBER }, establishedYear: { type: Type.NUMBER }
  }, required: ["companyName", "website", "websiteStatus", "companyType", "category", "mainBusinessSummary", "evidenceUrls", "productLineStatus", "leadPriority", "confidenceScore", "nextAction", "reason"] }
};

export const geminiService = {
  isConfigured() { return !!getAI(); },

  async generateKeywords(country: string, niche: string) {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");
    const prompt = `You are a medical-device B2B distributor research strategist. Target product: ${niche}. Target country: ${country}.
Create search queries specifically for identifying distributors, importers and channel partners. Do NOT simulate Google/Alibaba/Amazon autocomplete.
Return seven practical search dimensions:
- exactProduct: exact clinical/commercial product terms plus distributor/importer intent.
- specialty: broader clinical departments, procedures and adjacent equipment categories where a suitable distributor may operate.
- distributorImporter: local distributor, importer, wholesaler, dealer, supplier and medical-device company queries.
- competitorBrand: queries combining relevant established competitor brands with distributor/dealer/importer and the target country. Use brands only when genuinely relevant to the product category.
- localLanguage: native-language equivalents of product, specialty, distributor, importer and supplier queries.
- exhibition: relevant medical congress, trade-show, exhibitor-list, association and conference searches useful for discovering channel companies.
- tender: public procurement, hospital tender, awarded supplier and procurement-result searches useful for identifying active suppliers.
Also return englishCore and localCore. Prefer 6-10 high-value queries per dimension. Return JSON only.`;
    const response = await generateWithFallback(ai, { contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: {
      englishCore: { type: Type.STRING }, localCore: { type: Type.STRING },
      exactProduct: { type: Type.ARRAY, items: { type: Type.STRING } }, specialty: { type: Type.ARRAY, items: { type: Type.STRING } },
      distributorImporter: { type: Type.ARRAY, items: { type: Type.STRING } }, competitorBrand: { type: Type.ARRAY, items: { type: Type.STRING } },
      localLanguage: { type: Type.ARRAY, items: { type: Type.STRING } }, exhibition: { type: Type.ARRAY, items: { type: Type.STRING } }, tender: { type: Type.ARRAY, items: { type: Type.STRING } }
    }, required: ["englishCore", "localCore", "exactProduct", "specialty", "distributorImporter", "competitorBrand", "localLanguage", "exhibition", "tender"] } } });
    return JSON.parse(response.text || "{}");
  },

  async generateColdEmail(lead: any, myInfo: string, niche = "High-quality products") {
    const ai = getAI(); if (!ai) throw new Error("GEMINI_API_KEY is not defined.");
    const prompt = `Write a concise B2B cold email to a PROSPECT, not a lead known to be interested. Target product: ${niche}. Verified prospect data: ${JSON.stringify(lead)}. My company: ${myInfo}. Use only verified prospect facts. Never invent contacts, brands, certifications or market facts. CTA: ask whether the product line is relevant to their portfolio.`;
    const response = await generateWithFallback(ai, { contents: prompt }); return response.text;
  },

  async simulateLeads(country: string, englishNiche: string, localNiche: string, count = 10, page = 1, excludedCompanies: string[] = [], suggestions = "") {
    const ai = getAI(); if (!ai) throw new Error("GEMINI_API_KEY is not defined.");
    const prompt = `You are an evidence-first B2B medical-device lead researcher. TARGET COUNTRY: ${country}. TARGET PRODUCT: ${englishNiche}. LOCAL TERM: ${localNiche}. SEARCH STRATEGY HINTS: ${suggestions}. BATCH: ${page}. EXCLUDE: ${excludedCompanies.slice(0, 40).join(", ")}.
Accuracy is more important than quantity. ${count} is a TARGET/MAXIMUM, never a minimum. Never fabricate companies to fill the target. Search across exact product, clinical specialty, distributor/importer terminology, relevant competitor-brand dealer ecosystems, local-language queries, exhibition/exhibitor lists and tender/procurement supplier evidence. Return only real companies operating in ${country} with an official website supported by search evidence and relevant medical-device channel evidence. Never construct domains, emails, contacts or evidence URLs. Unknown fields must be empty. No evidenceUrls means confidence <=50 and cannot be priority A. Hospitals, clinics and consumer retailers should normally be omitted. Returning fewer than ${count}, including [], is valid. Return JSON.`;
    const response = await generateWithFallback(ai, { contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: leadSchema } });
    let parsed: any[] = [];
    try { const raw = JSON.parse((response.text || "[]").replace(/```json|```/g, "").trim()); parsed = Array.isArray(raw) ? raw : (raw.leads || raw.companies || []); }
    catch (err) { console.error("Lead JSON parse failed", err); return []; }
    const excludes = new Set(excludedCompanies.map(normalizeName)); const seen = new Set<string>(); const results: any[] = [];
    for (const item of parsed) {
      const nameKey = normalizeName(item.companyName); if (!nameKey || seen.has(nameKey) || excludes.has(nameKey)) continue;
      item.website = normalizeUrl(item.website); item.evidenceUrls = Array.isArray(item.evidenceUrls) ? item.evidenceUrls.map(normalizeUrl).filter(Boolean) : [];
      if (!isRealNonSyntheticCompany(item)) continue;
      let priority = item.leadPriority || "C"; let confidence = Number.isFinite(item.confidenceScore) ? Math.max(0, Math.min(100, item.confidenceScore)) : 40; let action = item.nextAction || "verify_first"; const evidenceCount = item.evidenceUrls.length;
      if (["unreachable", "parked", "outdated"].includes(item.websiteStatus) || ["clinic/hospital/training center", "consumer health brand", "irrelevant/unknown"].includes(item.companyType)) { priority = "D"; action = "skip"; }
      if (!evidenceCount) { confidence = Math.min(confidence, 50); if (priority === "A") priority = "C"; action = priority === "D" ? "skip" : "verify_first"; }
      if (item.companyType === "manufacturer/OEM" && priority === "A") priority = "B";
      const clampFit = (v: any) => Math.max(0, Math.min(evidenceCount ? 10 : 5, Number.isFinite(v) ? v : 0)); seen.add(nameKey);
      results.push({ companyName: item.companyName, country, category: item.category || "Distributor", website: item.website, phone: item.phone || "Not specified", email: item.email || "Not specified", linkedinUrl: normalizeUrl(item.linkedinUrl) || "#", contactPerson: "Not specified", position: "Not specified", specialty: item.specialty || item.mainBusinessSummary || "", websiteStatus: item.websiteStatus || "unknown", companyType: item.companyType || "irrelevant/unknown", mainBusinessSummary: item.mainBusinessSummary || "", relevantKeywordsFound: Array.isArray(item.relevantKeywordsFound) ? item.relevantKeywordsFound : [], evidenceUrls: item.evidenceUrls, productLineStatus: item.productLineStatus || "weak evidence", videoLaryngoscopeFit: clampFit(item.videoLaryngoscopeFit), bronchoscopeFit: clampFit(item.bronchoscopeFit), entEndoscopeFit: clampFit(item.entEndoscopeFit), disposableScopeFit: clampFit(item.disposableScopeFit), recommendedProductToPitch: item.recommendedProductToPitch || "", leadPriority: priority, confidenceScore: confidence, nextAction: action, reason: item.reason || "", seoRank: Number.isFinite(item.seoRank) ? item.seoRank : undefined, establishedYear: Number.isFinite(item.establishedYear) ? item.establishedYear : undefined });
      if (results.length >= count) break;
    }
    return results;
  }
};
