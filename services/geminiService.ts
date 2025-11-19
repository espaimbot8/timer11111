
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSubtasks = async (goal: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Break down the goal "${goal}" into 3-6 actionable subtasks. Return only the subtasks.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    if (response.text) {
       return JSON.parse(response.text);
    }
    return [];
  } catch (e) {
    console.error(e);
    // Fallback in case of error/quota limits
    return ["Research concepts", "Draft outline", "Gather resources", "Review material"];
  }
};

export const generateMotivation = async (context?: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give me a short, punchy motivation quote for someone studying/working hard${context ? ` on ${context}` : ''}. Max 10 words. Lowercase aesthetic style.`,
    });
    return response.text || "focus on the process.";
  } catch (e) {
    return "focus on the process.";
  }
};

export const getExamStudyTips = async (subject: string): Promise<string> => {
   try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide 4 brief, bulleted study tips for a ${subject} exam.`,
    });
    return response.text || `• Review ${subject} syllabus\n• Practice past papers`;
  } catch (e) {
    return `• Review ${subject} syllabus\n• Practice past papers`;
  }
};
