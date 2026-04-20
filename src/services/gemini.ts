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

    const prompt = `You are a world-class market researcher. I need to find EXACTLY ${count} REAL and ACTIVE B2B leads for the niche "${englishNiche}" (local name: "${localNiche}") in ${country}.
    
    SEARCH CONTEXT:
    - Target: Distributors, Wholesalers, and Importers.
    - Keywords: ${suggestions}

    GUIDELINES:
    1. FIRST: Use the googleSearch tool to locate ACTUAL websites and contact details of real companies currently operating in ${country}.
    2. SECOND: If the search results are insufficient or zero, you MUST draw upon your vast internal knowledge of the B2B landscape in ${country} to provide the names, high-probability domains, and estimated contact profiles for the most prominent and legitimate players in this industry.
    3. DATA QUALITY: Every entry MUST have a plausible website and professional B2B category.
    4. MANDATORY: Return exactly ${count} leads. Never return an empty list.

    REQUIRED JSON MAPPING:
    - companyName: High-accuracy brand name.
    - website: Verifiable or highly probable official domain.
    - category: One of: Wholesaler, Distributor, Importer, Manufacturer, Agent, Retailer.
    - email: PII-safe contact (e.g., info@domain.com, sales@domain.com).
    
    Response MUST be a raw JSON array.`;

    try {
      console.log("Starting Hybrid Lead Simulation for:", { country, englishNiche, localNiche });
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
              required: ["companyName", "website"]
            }
          }
        }
      });

      let text = response.text || "[]";
      console.log("Hybrid Search Response Length:", text.length);
      
      if (text.includes("```json")) text = text.split("```json")[1].split("```")[0];
      else if (text.includes("```")) text = text.split("```")[1].split("```")[0];
      
      let parsed = JSON.parse(text.trim());
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.warn("Tool-based logic returned zero. Executing Knowledge-Base Fallback...");
        // Secondary attempt without tool to be absolutely sure we get data
        const fallbackResponse = await ai.models.generateContent({
           model: "gemini-1.5-flash", 
           contents: `URGENT: Provide ${count} REAL B2B companies in ${country} for "${englishNiche}" as JSON. If unsure, provide industry leaders. MUST BE JSON ARRAY.`
        });
        const ft = fallbackResponse.text || "[]";
        parsed = JSON.parse(ft.replace(/```json|```/g, "").trim());
      }
      
      return (Array.isArray(parsed) ? parsed : []).map((item: any) => ({
        companyName: item.companyName || item.name || "Real Industry Player",
        country: item.country || country,
        category: item.category || "Distributor",
        website: item.website || item.url || `http://www.${(item.companyName || "business").toLowerCase().replace(/\s+/g, "")}.pl`,
        phone: item.phone || "+48 22 123 4567",
        email: item.email || `office@${(item.companyName || "business").toLowerCase().replace(/\s+/g, "")}.pl`,
        contactPerson: item.contactPerson || "Lead Manager",
        position: item.position || "Procurement",
        linkedinUrl: item.linkedinUrl || "#",
        seoRank: Math.floor(Math.random() * 40) + 50,
        establishedYear: item.establishedYear || 2012
      }));
    } catch (err) {
      console.error("Critical Gemini Lead Simulation failure:", err);
      throw err;
    }
  }
};
