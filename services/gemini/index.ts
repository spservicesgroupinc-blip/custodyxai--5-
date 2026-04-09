// ============================================================================
// Gemini AI Services - Barrel Export
// This file re-exports all modular services for backward compatibility.
// New code should import directly from the specific service files.
// ============================================================================

// Shared
export { ai, formatUserProfileContext } from './aiClient';

// Chat & Report Generation
export {
    getChatResponse,
    generateJsonReport,
    getThemeAnalysis,
} from './chatService';

// Analysis
export {
    getSingleIncidentAnalysis,
    generateDeepMessagingAnalysis,
} from './analysisService';

// Legal
export {
    getLegalAssistantResponse,
    getInitialLegalAnalysis,
    analyzeDocument,
    redraftDocument,
    generateEvidencePackage,
} from './legalService';

// Voice Agent
export {
    connectToAgent,
    createPcmBlob,
    encode,
    decode,
    decodeAudioData,
} from './agentService';
