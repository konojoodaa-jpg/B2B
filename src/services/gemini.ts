import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const pk = process.env.GEMINI_API_KEY;
    const vpk = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    const gpk = (import.meta as any).env?.GEMINI_API_KEY;

    console.log("Environment Probe:", {
      process_env: pk ? `${pk.slice(0, 4)}...` : "missing",
      vite_env: vpk ? `${vpk.slice(0, 4)}...` : "missing",
      alt_env: gpk ? `${gpk.slice(0, 4)}...` : "missing"
    });

    // Extensive fallback for environment variables
    const apiKey = pk || vpk || gpk;
    
    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
      console.error("Gemini API Key is missing or invalid. Found:", apiKey);
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const geminiService = {
  isConfigured() {
    return getAI() !== null;
  },

  async generateKeywords(country: string, niche: string) {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");

    const prompt = `You are a professional B2B lead generation and SEO expert.
    
    Target Product/Core Keyword: ${niche}
    Target Country: ${country}

    Goal: 
    1. Translate the core keyword "${niche}" into the primary local language of ${country}.
    2. Simulate the autocomplete/search suggestion dropdown for three major global platforms (Google, Alibaba, Amazon).
    3. The suggestions MUST cover BOTH English versions and Local Language versions of the search terms.

    Specific Requirements:
    - englishCore: The original or primary English commercial term for this product.
    - localCore: The most accurate B2B sourcing translation for "${niche}" in ${country}'s language.
    - google: Top 10 B2B search suggestions (Mixed English and Local).
    - alibaba: Top 10 wholesale sourcing suggestions (Mixed English and Local).
    - amazon: Top 10 high-intent buyer suggestions (Mixed English and Local).
    - localTerms: 8-10 other highly relevant local search variants.

    Return the result as a JSON object matching the keys exactly.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              englishCore: { type: Type.STRING },
              localCore: { type: Type.STRING },
              google: { type: Type.ARRAY, items: { type: Type.STRING } },
              alibaba: { type: Type.ARRAY, items: { type: Type.STRING } },
              amazon: { type: Type.ARRAY, items: { type: Type.STRING } },
              localTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["englishCore", "localCore", "google", "alibaba", "amazon", "localTerms"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      return JSON.parse(response.text);
    } catch (err) {
      console.error("Gemini Keyword Generation Error:", err);
      throw err;
    }
  },

  async generateColdEmail(lead: any, myInfo: string, niche: string = "High-quality products") {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");

    const prompt = `Write a professional, high-converting B2B cold email for a lead interested in ${niche}.
    Lead Info: ${JSON.stringify(lead)}
    My Company Info: ${myInfo}
    Language: The email should be in ${lead.country}'s local language with an English translation below.
    Goal: Introduce our ${niche} and request a brief meeting or catalog review.
    Aesthetic: Professional, respectful of GDPR, value-driven.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      return response.text;
    } catch (err) {
      console.error("Gemini Email Generation Error:", err);
      throw err;
    }
  },

  async simulateLeads(country: string, englishNiche: string, localNiche: string, count: number = 10, page: number = 1, excludedCompanies: string[] = [], suggestions: string = "") {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");

    const prompt = `Find and return ${count} REAL B2B leads for "${englishNiche}" (also known as "${localNiche}") in ${country}.
    Target Audience: Wholesalers, Distributors, Large Importers, and specialized B2B Retailers.
    Search Context: Page ${page} of market research.
    Additional Search Context (Top Autocomplete Terms): ${suggestions}

    CRITICAL INSTRUCTIONS:
    1. EXCLUSIVELY use the googleSearch tool to locate actual websites of businesses in ${country} that match this niche.
    2. Search using BOTH "${englishNiche}" and "${localNiche}" as well as highly relevant combinations from the provided suggestions: ${suggestions}.
    3. Only return REAL, EXISTING companies with VERIFIABLE websites. 
    4. DO NOT return any of these companies: ${excludedCompanies.length > 0 ? excludedCompanies.join(", ") : "None"}.
    5. Ensure you return at least 5-8 solid results if possible.
    6. Return factual, strictly formatted JSON data for: companyName, country, category, website, phone, email (if available, otherwise "info@domain.com"), contactPerson, position, linkedinUrl, seoRank (0-100), establishedYear.

    Categories must be one of: Wholesaler, Distributor, Importer, Manufacturer, Agent.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                companyName: { type: Type.STRING },
                country: { type: Type.STRING },
                category: { type: Type.STRING },
                website: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
                contactPerson: { type: Type.STRING },
                position: { type: Type.STRING },
                linkedinUrl: { type: Type.STRING },
                seoRank: { type: Type.NUMBER },
                establishedYear: { type: Type.NUMBER },
              },
              required: ["companyName", "country", "category", "website", "phone", "email", "contactPerson", "position", "linkedinUrl", "seoRank", "establishedYear"]
            }
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI for leads");
      }

      return JSON.parse(response.text);
    } catch (err) {
      console.error("Gemini Lead Simulation Error:", err);
      throw err;
    }
  }
};
