import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: any = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      // In production, we don't want to crash top-level, but we need the key for calls.
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const geminiService = {
  async generateKeywords(country: string, niche: string) {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");

    const prompt = `You are a professional B2B lead generation and SEO expert.
    
    Target Product/Keyword: ${niche}
    Target Country: ${country}

    Goal: Simulate the autocomplete/search suggestion dropdown for three major global platforms.
    
    1. Google Autocomplete: Top 10 long-tail or highly relevant business search terms on google.com.${country.toLowerCase().slice(0,2)}.
    2. Alibaba Autocomplete: Top 10 wholesale/supplier sourcing terms for this product.
    3. Amazon Autocomplete: Top 10 high-intent buyer/retail terms for this product.
    4. Local Language: 5-8 most relevant translations or local terms for "${niche}" in ${country}'s primary language.

    Constraint: All terms must be highly relevant and specific.
    
    Return the result as a JSON object with keys: google (array), alibaba (array), amazon (array), localTerms (array).`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            google: { type: Type.ARRAY, items: { type: Type.STRING } },
            alibaba: { type: Type.ARRAY, items: { type: Type.STRING } },
            amazon: { type: Type.ARRAY, items: { type: Type.STRING } },
            localTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["google", "alibaba", "amazon", "localTerms"]
        }
      }
    });

    return JSON.parse(response.text);
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

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    return response.text;
  },

  async simulateLeads(country: string, niche: string, count: number = 5, page: number = 1, excludedCompanies: string[] = []) {
    const ai = getAI();
    if (!ai) throw new Error("GEMINI_API_KEY is not defined.");

    const prompt = `Find and return ${count} REAL B2B leads for ${niche} (distributors, medical suppliers, or relevant traders) in ${country}.
    This is for SEARCH PAGE #${page}. 
    
    CRITICAL: 
    1. Only return REAL, EXISTING companies with VERIFIABLE websites. 
    2. USE GOOGLE SEARCH to confirm their existence and details.
    3. DO NOT return any of these companies as they are already in the database: ${excludedCompanies.length > 0 ? excludedCompanies.join(", ") : "None"}.
    4. Ensure the website domains are correct and active. 
    5. Return factual data for: companyName, country, category, website, phone, email, contactPerson, position, linkedinUrl, seoRank, establishedYear.
    
    Categories: Distributor, Hospital, Clinic, Trader.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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

    return JSON.parse(response.text);
  }
};
