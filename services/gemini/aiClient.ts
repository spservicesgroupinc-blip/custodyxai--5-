import { GoogleGenAI } from "@google/genai";
import { UserProfile } from '../types';

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const formatUserProfileContext = (profile: UserProfile | null): string => {
    if (!profile || !profile.name) return '';

    let context = `The user's name is ${profile.name}`;
    if (profile.role) {
        context += `, and they identify as the ${profile.role}. The other parent should be referred to as the ${profile.role === 'Mother' ? 'Father' : 'Mother'}.`;
    }
    if (profile.children && profile.children.length > 0) {
        context += ` The child/children involved are: ${profile.children.join(', ')}.`;
    }
    return `\n### User Context\n${context}\n`;
};
