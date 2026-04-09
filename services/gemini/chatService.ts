import { GoogleGenAI, Part, Content, Type } from "@google/genai";
import { ChatMessage, GeneratedReportData, Report, Theme, UserProfile } from '../../types';
import { SYSTEM_PROMPT_CHAT, SYSTEM_PROMPT_REPORT_GENERATION, SYSTEM_PROMPT_THEME_ANALYSIS } from '../../constants';
import { ai, formatUserProfileContext } from './aiClient';

const reportResponseSchema = {
    type: Type.OBJECT,
    properties: {
        content: { type: Type.STRING, description: "A detailed, neutral summary of the incident in Markdown format, with specific headings." },
        category: { type: Type.STRING, description: "The single most appropriate category for the incident." },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3-5 relevant keywords as tags." },
        legalContext: { type: Type.STRING, description: "An optional, neutral sentence connecting the incident to a principle from Indiana law. Omit if not applicable." }
    },
    required: ['content', 'category', 'tags']
};

const themeAnalysisSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The specific, concrete behavioral theme identified." },
            value: { type: Type.NUMBER, description: "The number of reports that mention this theme." }
        },
        required: ['name', 'value']
    }
};

const formatMessagesToContent = (messages: ChatMessage[]): Content[] => {
    return messages.map(msg => {
        const parts: Part[] = [{ text: msg.content }];
        if (msg.images) {
            msg.images.forEach(image => {
                parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
            });
        }
        return { role: msg.role, parts };
    });
};

export const getChatResponse = async (messages: ChatMessage[], userProfile: UserProfile | null): Promise<string> => {
    const contents = formatMessagesToContent(messages);
    const systemInstruction = SYSTEM_PROMPT_CHAT.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: { systemInstruction: systemInstruction },
    });

    return response.text;
};

export const generateJsonReport = async (messages: ChatMessage[], userProfile: UserProfile | null): Promise<GeneratedReportData | null> => {
    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

    const userPrompt = `Based on the conversation transcript provided below, please generate the incident report JSON.\n\n--- CONVERSATION START ---\n\n${conversationText}\n\n--- CONVERSATION END ---`;
    const systemInstruction = SYSTEM_PROMPT_REPORT_GENERATION.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: reportResponseSchema,
            }
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            console.error("Received empty response from report generation.");
            return null;
        }

        const reportData = JSON.parse(jsonText);
        if (reportData.content && reportData.category && reportData.tags) {
            return reportData as GeneratedReportData;
        }
        return null;
    } catch (e) {
        console.error("Failed to generate or parse report JSON:", e);
        return null;
    }
};

export const getThemeAnalysis = async (reports: Report[], category: string): Promise<Theme[]> => {
    const reportsContent = reports.map(r => `--- REPORT ---\n${r.content}\n--- END REPORT ---`).join('\n\n');
    const prompt = SYSTEM_PROMPT_THEME_ANALYSIS.replace('{CATEGORY_NAME}', category);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `${prompt}\n\n## Incident Reports Content\n\n${reportsContent}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: themeAnalysisSchema,
            }
        });

        const jsonText = response.text.trim();
        const themes = JSON.parse(jsonText);
        if (Array.isArray(themes)) {
            return themes as Theme[];
        }
        return [];
    } catch (e) {
        console.error("Failed to get theme analysis:", e);
        return [];
    }
};
