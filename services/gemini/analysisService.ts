import { Report, UserProfile, MessagingAnalysisReport } from '../../types';
import { SYSTEM_PROMPT_SINGLE_INCIDENT_ANALYSIS } from '../../constants/behavioralPrompts';
import { SYSTEM_PROMPT_DEEP_MESSAGING_ANALYSIS } from '../../constants';
import { ai, formatUserProfileContext } from './aiClient';
import { Type } from '@google/genai';

const messagingAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        conflictScore: { type: Type.NUMBER, description: "A score from 1 to 10 indicating conflict level." },
        conflictScoreReasoning: { type: Type.STRING, description: "Brief explanation of the score." },
        dominantThemes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    theme: { type: Type.STRING },
                    description: { type: Type.STRING },
                    frequency: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
                }
            }
        },
        communicationDynamics: {
            type: Type.OBJECT,
            properties: {
                initiator: { type: Type.STRING },
                responsiveness: { type: Type.STRING },
                tone: { type: Type.STRING }
            }
        },
        flaggedBehaviors: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    behavior: { type: Type.STRING },
                    example: { type: Type.STRING },
                    impact: { type: Type.STRING }
                }
            }
        },
        actionableRecommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
    },
    required: ['conflictScore', 'dominantThemes', 'communicationDynamics', 'flaggedBehaviors', 'actionableRecommendations']
};

export const getSingleIncidentAnalysis = async (
    mainReport: Report,
    allReports: Report[],
    userProfile: UserProfile | null
): Promise<{ analysis: string; sources: any[] }> => {
    const mainReportContent = `--- PRIMARY INCIDENT TO ANALYZE (ID: ${mainReport.id}, Date: ${new Date(mainReport.createdAt).toLocaleDateString()}) ---\n${mainReport.content}\n--- END PRIMARY INCIDENT ---`;

    const otherReportsContent = allReports
        .filter(r => r.id !== mainReport.id)
        .map(r => `--- SUPPORTING REPORT (ID: ${r.id}, Date: ${new Date(r.createdAt).toLocaleDateString()}) ---\n${r.content}\n--- END SUPPORTING REPORT ---`)
        .join('\n\n');

    const systemInstruction = SYSTEM_PROMPT_SINGLE_INCIDENT_ANALYSIS;
    const fullPrompt = `${systemInstruction}\n\n${formatUserProfileContext(userProfile)}\n\n## Incident Reports for Analysis:\n\n${mainReportContent}\n\n${otherReportsContent}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fullPrompt,
        config: { tools: [{ googleSearch: {} }] },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { analysis: response.text, sources };
};

export const generateDeepMessagingAnalysis = async (
    documentContent: string,
    userProfile: UserProfile | null
): Promise<MessagingAnalysisReport | null> => {
    const systemInstruction = SYSTEM_PROMPT_DEEP_MESSAGING_ANALYSIS.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));
    const userPrompt = `Please analyze the following chat log data:\n\n${documentContent.substring(0, 25000)}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: messagingAnalysisSchema,
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as MessagingAnalysisReport;
    } catch (error) {
        console.error("Error generating messaging analysis:", error);
        return null;
    }
};
