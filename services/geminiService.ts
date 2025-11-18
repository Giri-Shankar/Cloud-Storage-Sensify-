import { GoogleGenAI, Type } from "@google/genai";
import type { Insight } from '../types';

// Per coding guidelines, the API key is assumed to be available in process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFileContent = async (
  fileName: string,
  fileContent: string,
  userPrompt: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const fullPrompt = `
      You are an expert data analyst.
      Analyze the following file content and respond to the user's request.

      File Name: ${fileName}
      
      File Content:
      ---
      ${fileContent}
      ---
      
      User Request: "${userPrompt}"

      Provide a clear, concise, and helpful analysis based on the data. Use markdown for formatting if it helps clarity.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error analyzing file with Gemini:", error);
    return "An error occurred while analyzing the file. Please check the console for details.";
  }
};

export const generateDashboardInsights = async (dataSummary: string): Promise<Insight[]> => {
  try {
    const model = 'gemini-2.5-flash';
    const fullPrompt = `
      You are an expert data analyst for IoT sensor data.
      Analyze the following summary of sensor data and generate exactly 4 diverse and actionable insights.
      The insights should cover potential issues, anomalies, or notable patterns.
      Categorize each insight with a severity level.

      Data Summary:
      ---
      ${dataSummary}
      ---

      Your response MUST be a valid JSON array of 4 objects. Do not wrap it in markdown.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              level: { type: Type.STRING, description: "The severity of the insight.", enum: ['critical', 'warning', 'info'] },
              title: { type: Type.STRING, description: "A short, descriptive title for the insight." },
              description: { type: Type.STRING, description: "A detailed description of the insight (2-3 sentences)." },
              recommendation: { type: Type.STRING, description: "A clear, actionable recommendation." },
            },
            required: ['level', 'title', 'description', 'recommendation'],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as Insight[];
  } catch (error) {
    console.error("Error generating dashboard insights with Gemini:", error);
    return [
      { level: 'critical', title: 'Error Generating Insights', description: 'Could not connect to the AI model to generate insights. The summary may have been too complex or an API error occurred.', recommendation: 'Please check your API key and network connection, or try with a different data file.' },
      { level: 'warning', title: 'Data Parsed Locally', description: 'AI insights could not be generated. The dashboard is currently showing metrics based on local data parsing only.', recommendation: 'Refresh the page or check the console for error details.' },
      { level: 'info', title: 'Local Data Available', description: 'The selected data file has been parsed successfully on your device.', recommendation: 'You can explore the charts and data distributions below while the AI service is unavailable.' },
      { level: 'info', title: 'File Analysis Feature', description: 'The manual "Analyze a File" feature at the bottom of the page can still be used to ask specific questions about your data.', recommendation: 'Scroll down to ask a direct question to the AI model.' }
    ];
  }
};
