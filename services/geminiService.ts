import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askResearchAssistant = async (
  prompt: string, 
  context: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key is missing. Please ensure process.env.API_KEY is configured.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context:\n${context}\n\nUser Query:\n${prompt}`,
      config: {
        systemInstruction: "You are a senior theoretical condensed matter physicist assistant. You help with formula derivations, code optimization (Python/Julia/Matlab), and summarizing literature. Be concise, precise, and use LaTeX for math where appropriate.",
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with AI Assistant.";
  }
};