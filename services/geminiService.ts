
import { GoogleGenAI } from "@google/genai";
import { RunSession } from "../types.ts";

export const getRunInsight = async (run: RunSession): Promise<string> => {
  // Fix: Initializing GoogleGenAI client using the required pattern with process.env.API_KEY directly
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const durationMinutes = run.endTime ? (run.endTime - run.startTime) / 60000 : 0;
    const avgSpeedKmh = run.distanceKm / (durationMinutes / 60 || 1);

    const prompt = `
      Analiza esta carrera y da feedback motivador y técnico (máx 60 palabras).
      - Distancia: ${run.distanceKm.toFixed(2)} km
      - Duración: ${durationMinutes.toFixed(1)} minutos
      - Velocidad Media: ${avgSpeedKmh.toFixed(2)} km/h
      - Ritmo Medio: ${run.averagePace.toFixed(2)} min/km
      
      Da un consejo específico para la próxima vez.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Eres un coach de running élite. Breve, directo, motivador y en español de España."
      }
    });
    
    // Fix: Using the .text property directly as per Gemini API best practices
    return response.text || "¡Buen trabajo hoy!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "¡Increíble esfuerzo! Sigue así.";
  }
};
