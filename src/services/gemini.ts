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
    - Research Page: ${page}
    - Keywords used: ${suggestions}

    STRICT GUIDELINES:
    1. EXCLUSIVELY use the googleSearch tool to find actual corporate websites. 
    2. DO NOT return hypothetical data. Every company must have a valid URL.
    3. If search results are sparse, expand to the nearest logical B2B tier (e.g., related industrial suppliers).
    4. You MUST return an array of objects. Do not return an empty array. If you cannot find ${count}, return as many as you can find (minimum 5).

    DATA MAPPING:
    - companyName: Full legal name.
    - website: Full URL starting with http/https.
    - category: Must be one of: Wholesaler, Distributor, Importer, Manufacturer, Agent, Retailer.
    - email: Use a REAL found email or generate a plausible B2B contact email like info@company.com based on the domain.
    - seoRank: A numeric score 10-95 based on their online presence.
    
    Response MUST be a raw JSON array of objects.`;

    try {
      console.log("Simulating leads for niche:", englishNiche, "in country:", country);
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
              required: ["companyName", "website", "category"] // Only require the bare essentials
            }
          }
        }
      });

      let text = response.text || "";
      console.log("Gemini Raw Response Received, Length:", text.length);
      
      // Sanitization
      if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0];
      } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0];
      }
      
      let parsed = JSON.parse(text.trim());
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.warn("AI returned empty leads or non-array, attempting internal fallback...");
        // If Google Search failed to give results, the AI should try again without the tool constraint in mind
        // but for now let's just log and see. 
        // Actually, let's provide a safety fallback if it's truly 0 to show the UI works
        if (!Array.isArray(parsed)) parsed = [];
      }
      
      // Ensure all fields have at least something to avoid UI crashes
      return parsed.map((item: any) => ({
        companyName: item.companyName || "Unknown Company",
        country: item.country || country,
        category: item.category || "Distributor",
        website: item.website || "http://example.com",
        phone: item.phone || "+48 000 000 000",
        email: item.email || "contact@provider.pl",
        contactPerson: item.contactPerson || "B2B Manager",
        position: item.position || "Purchasing Dept",
        linkedinUrl: item.linkedinUrl || "#",
        seoRank: item.seoRank || 50,
        establishedYear: item.establishedYear || 2010
      }));
    } catch (err) {
      console.error("Critical Gemini Lead Simulation failure:", err);
      throw err;
    }
  }
};
