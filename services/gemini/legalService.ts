import { Part, Type } from "@google/genai";
import { Report, UserProfile, LegalAssistantResponse, StoredDocument, StructuredLegalDocument } from '../../types';
import { SYSTEM_PROMPT_LEGAL_ASSISTANT, SYSTEM_PROMPT_LEGAL_ANALYSIS_SUGGESTION, SYSTEM_PROMPT_DOCUMENT_ANALYSIS, SYSTEM_PROMPT_DOCUMENT_REDRAFT, SYSTEM_PROMPT_EVIDENCE_PACKAGE } from '../../constants/legalPrompts';
import { ai, formatUserProfileContext } from './aiClient';

const structuredLegalDocumentSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The main title of the document." },
        subtitle: { type: Type.STRING, description: "An optional subtitle." },
        metadata: {
            type: Type.OBJECT,
            properties: {
                date: { type: Type.STRING, description: "The date in YYYY-MM-DD format." },
                clientName: { type: Type.STRING, description: "The client's name, if applicable." },
                caseNumber: { type: Type.STRING, description: "The case number, if applicable." }
            },
            required: ['date']
        },
        preamble: { type: Type.STRING, description: "The introductory paragraph or preamble." },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    heading: { type: Type.STRING, description: "The heading of the section." },
                    body: { type: Type.STRING, description: "The body content of the section, with newlines for paragraphs." }
                },
                required: ['heading', 'body']
            }
        },
        closing: { type: Type.STRING, description: "The closing text before signatures." },
        notes: { type: Type.STRING, description: "Optional notes at the end of the document." }
    },
    required: ['title', 'metadata', 'preamble', 'sections', 'closing']
};

export const getLegalAssistantResponse = async (
    reports: Report[],
    documents: StoredDocument[],
    query: string,
    userProfile: UserProfile | null,
    analysisContext: string | null
): Promise<LegalAssistantResponse & { sources?: any[] }> => {
    const reportsContent = reports.map(r => `--- REPORT (ID: ${r.id}, Date: ${new Date(r.createdAt).toLocaleDateString()}) ---\n${r.content}\n--- END REPORT ---`).join('\n\n');

    const textDocuments = documents.filter(d => d.mimeType.startsWith('text/'));
    const binaryDocuments = documents.filter(d => !d.mimeType.startsWith('text/'));

    const textDocumentsContent = textDocuments.length > 0
        ? textDocuments
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(doc => {
                let contentSummary = '';
                try {
                    const decodedText = decodeURIComponent(escape(atob(doc.data)));
                    contentSummary = `Content Preview: ${decodedText.substring(0, 750)}...`;
                } catch (e) {
                    contentSummary = 'Content could not be decoded.';
                }
                return `--- DOCUMENT ---\nFolder: ${doc.folder}\nName: ${doc.name}\nDate Created: ${new Date(doc.createdAt).toLocaleString()}\n${contentSummary}\n--- END DOCUMENT ---`;
            }).join('\n\n')
        : "No text documents available.";

    const binaryDocumentParts: Part[] = binaryDocuments.map(doc => ({
        inlineData: { data: doc.data, mimeType: doc.mimeType }
    }));

    const systemInstruction = `${SYSTEM_PROMPT_LEGAL_ASSISTANT}\n${formatUserProfileContext(userProfile)}`;

    try {
        let promptText = `${systemInstruction}\n\n## KNOWLEDGE BASE: Incident Reports\n\n${reportsContent}\n\n## KNOWLEDGE BASE: Generated & Text Documents\n\n${textDocumentsContent}`;

        if (analysisContext) {
            promptText += `\n\n## Forensic Incident Analysis (Primary Context):\n\n${analysisContext}`;
        }

        promptText += `\n\n## User's Question:\n\n${query}`;
        const textPart: Part = { text: promptText };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [textPart, ...binaryDocumentParts] },
            config: { tools: [{ googleSearch: {} }] },
        });

        const responseText = response.text;
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("No valid JSON object found in the response from Legal Assistant API.");
        }

        const jsonText = responseText.substring(firstBrace, lastBrace + 1);
        const parsedResponse = JSON.parse(jsonText);
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        if (parsedResponse.type && parsedResponse.content) {
            return { ...parsedResponse, sources } as LegalAssistantResponse & { sources?: any[] };
        }

        throw new Error("Invalid JSON structure from Legal Assistant API.");
    } catch (error) {
        console.error("Error getting or parsing legal assistant response:", error);
        return {
            type: 'chat',
            content: "I'm sorry, an unexpected error occurred while processing your request. Please try again."
        };
    }
};

export const getInitialLegalAnalysis = async (
    mainReport: Report,
    allReports: Report[],
    userProfile: UserProfile | null
): Promise<LegalAssistantResponse & { sources?: any[] }> => {
    const mainReportContent = `--- PRIMARY INCIDENT TO ANALYZE (ID: ${mainReport.id}, Date: ${new Date(mainReport.createdAt).toLocaleDateString()}) ---\n${mainReport.content}\n--- END PRIMARY INCIDENT ---`;

    const otherReportsContent = allReports
        .filter(r => r.id !== mainReport.id)
        .map(r => `--- SUPPORTING REPORT (ID: ${r.id}, Date: ${new Date(r.createdAt).toLocaleDateString()}) ---\n${r.content}\n--- END SUPPORTING REPORT ---`)
        .join('\n\n');

    const systemInstruction = `${SYSTEM_PROMPT_LEGAL_ANALYSIS_SUGGESTION}\n${formatUserProfileContext(userProfile)}`;
    const fullPrompt = `${systemInstruction}\n\n## Incident Reports for Analysis:\n\n${mainReportContent}\n\n${otherReportsContent}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: { tools: [{ googleSearch: {} }] },
        });

        const responseText = response.text;
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("No valid JSON object found in the response from Legal Analysis API.");
        }

        const jsonText = responseText.substring(firstBrace, lastBrace + 1);
        const parsedResponse = JSON.parse(jsonText);
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        if (parsedResponse.type === 'chat' && parsedResponse.content) {
            return { ...parsedResponse, sources } as LegalAssistantResponse & { sources?: any[] };
        }

        throw new Error("Invalid JSON structure from Legal Analysis API.");
    } catch (error) {
        console.error("Error getting or parsing initial legal analysis:", error);
        return {
            type: 'chat',
            content: "I'm sorry, an unexpected error occurred while analyzing the incident. Please try asking your question directly."
        };
    }
};

export const analyzeDocument = async (
    fileData: string,
    mimeType: string,
    userProfile: UserProfile | null
): Promise<string> => {
    const systemInstruction = `${SYSTEM_PROMPT_DOCUMENT_ANALYSIS}\n${formatUserProfileContext(userProfile)}`;

    const documentPart = { inlineData: { data: fileData, mimeType: mimeType } };
    const textPart = { text: "Please review and analyze this document according to your instructions." };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [documentPart, textPart] },
            config: { systemInstruction: systemInstruction },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing document:", error);
        return "I'm sorry, an unexpected error occurred while analyzing the document. Please try again.";
    }
};

export const redraftDocument = async (
    fileData: string,
    mimeType: string,
    analysisText: string,
    userProfile: UserProfile | null
): Promise<StructuredLegalDocument | null> => {
    const systemInstruction = `${SYSTEM_PROMPT_DOCUMENT_REDRAFT}\n${formatUserProfileContext(userProfile)}`;

    const documentPart = { inlineData: { data: fileData, mimeType: mimeType } };
    const textPart = { text: `Here is the analysis of the document you are about to redraft. Please incorporate all these suggestions into the new version:\n\n--- ANALYSIS ---\n${analysisText}\n--- END ANALYSIS ---` };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [documentPart, textPart] },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: structuredLegalDocumentSchema,
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StructuredLegalDocument;
    } catch (error) {
        console.error("Error redrafting document:", error);
        return null;
    }
};

export const generateEvidencePackage = async (
    selectedReports: Report[],
    selectedDocuments: StoredDocument[],
    userProfile: UserProfile | null,
    packageObjective: string,
): Promise<StructuredLegalDocument | null> => {
    const reportsString = selectedReports
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(r => `
--- INCIDENT REPORT ---
ID: ${r.id}
Date of Incident: ${new Date(r.createdAt).toLocaleString()}
Category: ${r.category}
Tags: [${r.tags.join(', ')}]
Legal Context Note: ${r.legalContext || 'None provided.'}
Report Content:
${r.content}
--- END REPORT ---
`).join('\n\n');

    const documentsString = selectedDocuments.map(d => `
--- DOCUMENT ---
Name: ${d.name}
Date Uploaded: ${new Date(d.createdAt).toLocaleString()}
--- END DOCUMENT ---
`).join('\n\n');

    let systemInstruction = SYSTEM_PROMPT_EVIDENCE_PACKAGE.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));
    systemInstruction = systemInstruction.replace('{CURRENT_DATE}', new Date().toLocaleDateString('en-CA'));
    systemInstruction = systemInstruction.replace('{PACKAGE_OBJECTIVE}', packageObjective);

    const userPrompt = `Please generate the evidence package based on the following data.\n\n## SELECTED INCIDENT REPORTS ##\n\n${reportsString}\n\n## SELECTED DOCUMENTS ##\n\n${documentsString}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: structuredLegalDocumentSchema,
                tools: [{ googleSearch: {} }],
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StructuredLegalDocument;
    } catch (e) {
        console.error("Failed to generate evidence package:", e);
        return null;
    }
};
