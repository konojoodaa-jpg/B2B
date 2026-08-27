import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || ["undefined", "null", ""].includes(apiKey)) {
    console.warn("AI Init: GEMINI_API_KEY is not defined.");
    return null;
  }
  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithFallback(ai: any, params: any) {
  const models = ["gemini-flash-latest", "gemini-3.1-flash-lite-preview", "gemini-3-flash-preview"];
  let lastError: any = null;
  for (const model of models) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (err: any) {
      lastError = err;
      const s = JSON.stringify(err).toLowerCase();
      if (s.includes("429") || s.includes("quota") || s.includes("503") || s.includes("unavailable") || s.includes("high demand")) {
        await sleep(800);
        continue;
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
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeName(name: unknown): string {
  return String(name || "")
    .toLowerCase()
    .replace(/sp\s*\.?\s*z\s*\.?\s*o\s*\.?\s*o\s*\.?/g, " ")
    .replace(/sp\s*\.?\s*k\s*\.?/g, " ")
    .replace(/s\s*\.?\s*a\s*\.?/g, " ")
    .replace(/gmbh|limited|ltd|incorporated|inc\.?/g, " ")
    .replace(/[^a-z0-9\p{L}]/gu, "")
    .trim();
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
  items: {
    type: Type.OBJECT,
    properties: {
      companyName: { type: Type.STRING },
      website: { type: Type.STRING },
      websiteStatus: { type: Type.STRING, enum: ["active", "unreachable", "parked", "redirected", "outdated", "unknown"] },
      companyType: { type: Type.STRING, enum: ["specialized distributor", "general medical webshop", "emergency/rescue supplier", "anesthesia/ICU distributor", "endoscopy distributor", "manufacturer/OEM", "clinic/hospital/training center", "consumer health brand", "irrelevant/unknown"] },
      category: { type: Type.STRING, enum: ["Wholesaler", "Distributor", "Importer", "Manufacturer", "Agent", "Retailer"] },
      mainBusinessSummary: { type: Type.STRING },
      relevantKeywordsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
      evidenceUrls: { type: Type.ARRAY, items: { type: Type.STRING } },
      productLineStatus: { type: Type.STRING, enum: ["active", "weak evidence", "possible historical", "not found"] },
      videoLaryngoscopeFit: { type: Type.INTEGER },
      bronchoscopeFit: { type: Type.INTEGER },
      entEndoscopeFit: { type: Type.INTEGER },
      disposableScopeFit: { type: Type.INTEGER },
      recommendedProductToPitch: { type: Type.STRING },
      leadPriority: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
      confidenceScore: { type: Type.INTEGER },
      nextAction: { type: Type.STRING, enum: ["email_now", "find_person_on_linkedin", "whatsapp_once", "verify_first", "skip"] },
      reason: { type: Type.STRING },
      email: { type: Type.STRING },
      phone: { type: Type.STRING },
      linkedinUrl: { type: Type.STRING },
      specialty: { type: Type.STRING },
      seoRank: { type: Type.NUMBER },
      establishedYear: { type: Type.NUMBER }
    },
    required: ["companyName", "website", "websiteStatus", "companyType", "category", "mainBusinessSummary", "evidenceUrls", "productLineStatus", "leadPriority", "confidenceScore", "nextAction", "reason"]
  }
};

export const geminiService = {
  isConfigured() {
    return !!getAI();
  },

  async generateKeywords(country: string, niche: string) {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");
    const prompt = `You are a B2B medical-device search strategist.
Target product: ${niche}
Target country: ${country}
Generate search terms for finding distributors/importers, not consumer shopping results.
englishCore: best English commercial/clinical term.
localCore: accurate local-language commercial/clinical term.
google: 10 searches mixing exact product, specialty, distributor/importer, procedure and local language.
alibaba: 10 CHANNEL/WHOLESALE discovery terms (do not pretend these are actual Alibaba autocomplete results).
amazon: 10 COMPETITOR/BRAND-ECOSYSTEM discovery terms suitable for Google research (do not pretend these are actual Amazon autocomplete results).
localTerms: 8-10 local-language variants including distributor, importer, supplier, specialty, tender/exhibition vocabulary.
Return JSON only.`;
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            englishCore: { type: Type.STRING }, localCore: { type: Type.STRING },
            google: { type: Type.ARRAY, items: { type: Type.STRING } },
            alibaba: { type: Type.ARRAY, items: { type: Type.STRING } },
            amazon: { type: Type.ARRAY, items: { type: Type.STRING } },
            localTerms: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["englishCore", "localCore", "google", "alibaba", "amazon", "localTerms"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  async generateColdEmail(lead: any, myInfo: string, niche = "High-quality products") {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");
    const prompt = `Write a concise B2B cold email to a PROSPECT, not a lead known to be interested.
Target product: ${niche}
Verified prospect data: ${JSON.stringify(lead)}
My company: ${myInfo}
Use only verified prospect facts. If product/brand evidence is weak, do not claim they sell a specific product.
Build the opening around a verified product-line or specialty overlap when available.
Do not use generic flattery. Do not claim prior interest. Do not invent contacts, brands, certifications or market facts.
Write first in the prospect country's main business language when appropriate, then provide English translation.
CTA should be low-friction: ask whether the product line is relevant to their portfolio, rather than forcing a meeting.`;
    const response = await generateWithFallback(ai, { contents: prompt });
    return response.text;
  },

  async simulateLeads(country: string, englishNiche: string, localNiche: string, count = 10, page = 1, excludedCompanies: string[] = [], suggestions = "") {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");

    const prompt = `You are an evidence-first B2B medical-device lead researcher.
TARGET COUNTRY: ${country}
TARGET PRODUCT: ${englishNiche}
LOCAL TERM: ${localNiche}
DISCOVERY HINTS: ${suggestions}
BATCH: ${page}
EXCLUDE: ${excludedCompanies.slice(0, 40).join(", ")}

PRIMARY RULE: accuracy and verifiability are more important than quantity. ${count} is a MAXIMUM, never a minimum. If only 3 companies can be supported, return 3. Never fill the list to satisfy quantity.

DISCOVERY STRATEGY:
1) Search exact product + distributor/importer in English and local language.
2) Search broader clinical specialty and procedure terms (ENT, endoscopy, anesthesia/ICU, pulmonology, urology etc. as relevant).
3) Search distributor ecosystems of established brands in the same clinical field.
4) Search local medical-device distributor/importer terminology, trade-show exhibitor and tender/supplier contexts.

VERIFICATION GATE — a company may be returned only when:
- it is a real identifiable business;
- there is evidence it operates in ${country};
- an official website URL is found; NEVER construct a domain from the company name;
- at least one accessible/search-grounded source supports its medical specialty or product relevance.

WEBSITE RULES:
- website must be the probable official homepage URL from search evidence, never guessed.
- websiteStatus=active ONLY when current search evidence supports that domain as the live official company site. Otherwise use unknown/redirected/unreachable as appropriate.
- Do not fabricate /products, /offer, /contact or any deep URL. evidenceUrls must be URLs actually surfaced by search evidence.

RELEVANCE:
HIGH: distributes target or directly competing products.
MEDIUM: distributes the same clinical specialty and could plausibly add target.
LOW: generic medical supplier with little specialty overlap.
Hospitals, clinics, training centers, consumer retailers and unrelated companies should normally be omitted.
Manufacturers/OEMs may be returned only if strategically useful, but mark them clearly and do not treat them as distributor prospects.

SCORING:
A requires: official website evidence + country evidence + distributor/importer role + strong product/specialty evidence + evidence URL.
B: credible adjacent specialty/channel fit with evidence.
C: weak/general fit or incomplete verification.
D: mismatch, hospital/clinic, unusable website, or unreliable evidence.
No evidenceUrls => confidence <= 50 and priority cannot be A.

ANTI-HALLUCINATION:
Never invent company names, websites, emails, phones, LinkedIn pages, product portfolios, brand relationships, addresses, dates or evidence URLs. Unknown fields should be empty strings/arrays. Returning [] is valid and preferred to questionable data.

Return up to ${count} distinct companies as JSON matching the schema.`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      config: { responseMimeType: "application/json", responseSchema: leadSchema }
    });

    let parsed: any[] = [];
    try {
      const raw = JSON.parse((response.text || "[]").replace(/```json|```/g, "").trim());
      parsed = Array.isArray(raw) ? raw : (raw.leads || raw.companies || []);
    } catch (err) {
      console.error("Lead JSON parse failed", err);
      return [];
    }

    const excludes = new Set(excludedCompanies.map(normalizeName));
    const seen = new Set<string>();
    const results: any[] = [];

    for (const item of parsed) {
      const nameKey = normalizeName(item.companyName);
      if (!nameKey || seen.has(nameKey) || excludes.has(nameKey)) continue;
      item.website = normalizeUrl(item.website);
      item.evidenceUrls = Array.isArray(item.evidenceUrls) ? item.evidenceUrls.map(normalizeUrl).filter(Boolean) : [];
      if (!isRealNonSyntheticCompany(item)) continue;

      let priority = item.leadPriority || "C";
      let confidence = Number.isFinite(item.confidenceScore) ? Math.max(0, Math.min(100, item.confidenceScore)) : 40;
      let action = item.nextAction || "verify_first";
      let reason = item.reason || "";
      const evidenceCount = item.evidenceUrls.length;
      const badWebsite = ["unreachable", "parked", "outdated"].includes(item.websiteStatus);
      const badType = ["clinic/hospital/training center", "consumer health brand", "irrelevant/unknown"].includes(item.companyType);

      if (badWebsite || badType) {
        priority = "D";
        action = "skip";
      }
      if (evidenceCount === 0) {
        confidence = Math.min(confidence, 50);
        if (priority === "A") priority = "C";
        action = priority === "D" ? "skip" : "verify_first";
      }
      if (item.companyType === "manufacturer/OEM" && priority === "A") priority = "B";

      const clampFit = (v: any) => Math.max(0, Math.min(evidenceCount ? 10 : 5, Number.isFinite(v) ? v : 0));
      seen.add(nameKey);
      results.push({
        companyName: item.companyName,
        country,
        category: item.category || "Distributor",
        website: item.website,
        phone: item.phone || "Not specified",
        email: item.email || "Not specified",
        linkedinUrl: normalizeUrl(item.linkedinUrl) || "#",
        contactPerson: item.contactPerson || "Not specified",
        position: item.position || "Not specified",
        specialty: item.specialty || item.mainBusinessSummary || "",
        websiteStatus: item.websiteStatus || "unknown",
        companyType: item.companyType || "irrelevant/unknown",
        mainBusinessSummary: item.mainBusinessSummary || "",
        relevantKeywordsFound: Array.isArray(item.relevantKeywordsFound) ? item.relevantKeywordsFound : [],
        evidenceUrls: item.evidenceUrls,
        productLineStatus: item.productLineStatus || "weak evidence",
        videoLaryngoscopeFit: clampFit(item.videoLaryngoscopeFit),
        bronchoscopeFit: clampFit(item.bronchoscopeFit),
        entEndoscopeFit: clampFit(item.entEndoscopeFit),
        disposableScopeFit: clampFit(item.disposableScopeFit),
        recommendedProductToPitch: item.recommendedProductToPitch || "",
        leadPriority: priority,
        confidenceScore: confidence,
        nextAction: action,
        reason,
        seoRank: Number.isFinite(item.seoRank) ? item.seoRank : undefined,
        establishedYear: Number.isFinite(item.establishedYear) ? item.establishedYear : undefined
      });
      if (results.length >= count) break;
    }

    return results;
  }
};
