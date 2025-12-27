
import { GoogleGenAI } from "@google/genai";
import { RunSession } from "../types.ts";

export const getRunInsight = async (run: RunSession): Promise<string> => {
  // Obtenemos la key directamente del entorno inyectado
  const apiKey = (window as any).process?.env?.API_KEY || "";
  
  if (!apiKey) {
    console.warn("API_KEY no encontrada. Feedback desactivado.");
    return "¡Excelente sesión! Sigue manteniendo este ritmo constante.";
  }

  // Inicializamos justo antes de usar
  const ai = new GoogleGenAI({ apiKey });
  
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Eres un coach de running élite. Breve, directo, motivador y en español de España."
      }
    });
    
    return response.text || "¡Buen trabajo hoy!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "¡Gran esfuerzo! Sigue así.";
  }
};
