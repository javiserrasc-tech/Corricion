
import { GoogleGenAI } from "@google/genai";
import { RunSession } from "../types";

export const getRunInsight = async (run: RunSession): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const durationMinutes = run.endTime ? (run.endTime - run.startTime) / 60000 : 0;
  const avgSpeedKmh = run.distanceKm / (durationMinutes / 60);

  const prompt = `
    Analyze this running session and provide a motivational and technical feedback (max 100 words).
    - Distance: ${run.distanceKm.toFixed(2)} km
    - Duration: ${durationMinutes.toFixed(1)} minutes
    - Average Speed: ${avgSpeedKmh.toFixed(2)} km/h
    - Average Pace: ${run.averagePace.toFixed(2)} min/km
    
    Provide insights on performance and one tip for the next run.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional running coach. Your tone is encouraging, data-driven, and concise."
      }
    });
    
    return response.text || "Could not generate insight at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI coach is currently resting. Great job on your run!";
  }
};
