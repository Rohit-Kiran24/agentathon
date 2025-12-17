
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GeminiService
 * Handles communication with Google's Gemini API.
 */
export const GeminiService = {
    genAI: null,
    model: null,

    initialize: (apiKey) => {
        if (!apiKey) return false;
        try {
            GeminiService.genAI = new GoogleGenerativeAI(apiKey);
            GeminiService.model = GeminiService.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            return true;
        } catch (e) {
            console.error("Failed to init Gemini", e);
            return false;
        }
    },

    /**
     * Generates a RAG response
     * @param {String} userQuery 
     * @param {Object} contextData - The retrieved relevant data
     */
    generateResponse: async (userQuery, contextData) => {
        if (!GeminiService.model) {
            return {
                text: "I am currently in Offline Mode. Please add a Gemini API Key in settings to enable advanced AI reasoning.",
                isOffline: true
            };
        }

        const prompt = `
      You are an expert Business Co-Pilot for an MSME owner. 
      Answer the user's question based strictly on the provided REAL-TIME DATA Context below.
      
      CONTEXT DATA:
      ${JSON.stringify(contextData, null, 2)}

      USER QUESTION:
      "${userQuery}"

      GUIDELINES:
      - Be concise and professional.
      - specific numbers from the context.
      - If the data doesn't answer the question, say "I don't have that information in my current records."
      - Do not invent data.
    `;

        try {
            const result = await GeminiService.model.generateContent(prompt);
            const response = await result.response;
            return { text: response.text(), isOffline: false };
        } catch (error) {
            console.error("Gemini Error Details:", error);
            return { text: `Error connecting to Gemini. Details: ${error.message}`, isError: true };
        }
    }
};
