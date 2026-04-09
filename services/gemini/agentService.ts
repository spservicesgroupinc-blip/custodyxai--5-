import { Type, FunctionDeclaration, Session, LiveServerMessage, Modality, Blob } from "@google/genai";
import { UserProfile } from '../../types';
import { SYSTEM_PROMPT_VOICE_AGENT } from '../../constants';
import { ai, formatUserProfileContext } from './aiClient';

const navigateToViewFunctionDeclaration: FunctionDeclaration = {
    name: 'navigateToView',
    parameters: {
        type: Type.OBJECT,
        description: 'Navigates the user to a specific view within the application.',
        properties: {
            view: {
                type: Type.STRING,
                description: `The view to navigate to. Must be one of: 'dashboard', 'timeline', 'new_report', 'patterns', 'insights', 'assistant', 'profile', 'documents', 'calendar'.`,
            },
        },
        required: ['view'],
    },
};

export const connectToAgent = (
    userProfile: UserProfile | null,
    callbacks: {
        onOpen: () => void;
        onMessage: (message: LiveServerMessage) => Promise<void>;
        onError: (error: ErrorEvent) => void;
        onClose: (event: CloseEvent) => void;
    }
): Promise<Session> => {
    const systemInstruction = SYSTEM_PROMPT_VOICE_AGENT.replace('{USER_PROFILE_CONTEXT}', formatUserProfileContext(userProfile));

    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: callbacks.onOpen,
            onmessage: callbacks.onMessage,
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [navigateToViewFunctionDeclaration] }, { googleSearch: {} }],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        },
    });
};

// Audio Utilities
export function createPcmBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768;
        }
    }
    return buffer;
}
