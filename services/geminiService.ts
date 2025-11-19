import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateSubtasks = async (goal: string): Promise<string[]> => {
  if (!apiKey) return ["Research core concepts", "Draft an outline", "Review notes", "Practice exercises"];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Break down the study goal "${goal}" into 3-4 concise, actionable subtasks (max 6 words each) for a student. Return only the tasks as a plain JSON list of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    if (text) {
        return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return ["Create a plan", "Gather resources", "Start working"];
  }
};

export const generateMotivation = async (context: string): Promise<string> => {
  if (!apiKey) return "Dream big, work hard, stay focused.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give me a short, aesthetic, lower-case motivational quote for a student. Max 15 words. No hashtags.`,
    });
    return response.text?.trim() || "focus on the process, not the outcome.";
  } catch (error) {
    return "your potential is endless.";
  }
};

export const getExamStudyTips = async (subject: string): Promise<string> => {
    if(!apiKey) return "• Review past papers\n• Focus on weak areas\n• Use active recall";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide 3 specific, high-impact study tips for preparing for a ${subject} exam. Keep them extremely concise (bullet points). No intro text.`
        });
        return response.text?.trim() || "• Review key terms\n• Practice problems\n• Sleep well";
    } catch (e) {
        return "• Prioritize active recall\n• Spaced repetition\n• Teach it to someone else";
    }
}