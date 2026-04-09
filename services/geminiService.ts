// ============================================================================
// DEPRECATED: This file is kept for backward compatibility only.
// All functionality has been split into modular services:
//   - services/gemini/chatService.ts    (chat, reports, themes)
//   - services/gemini/analysisService.ts (incident analysis, messaging analysis)
//   - services/gemini/legalService.ts   (legal assistant, documents, evidence)
//   - services/gemini/agentService.ts   (voice/live agent)
//   - services/gemini/aiClient.ts       (shared AI client, utilities)
//
// Please import directly from services/gemini/index.ts
// ============================================================================

export * from './gemini/index';
