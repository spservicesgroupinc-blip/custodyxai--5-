// ============================================================================
// CustodyX.AI - Code Quality & Improvement Report
// Generated: April 9, 2026
// ============================================================================
// This report identifies critical, high-priority, and medium-priority improvements
// needed across the codebase, architecture, security, and developer experience.
// ============================================================================

/*
================================================================================
1. CRITICAL ISSUES (Must Fix Immediately)
================================================================================

1.1 No Environment Variable Validation
---------------------------------------
File: App.tsx (line 78-81), vite.config.ts
Problem: API_KEY validation only happens at runtime in the browser. The vite.config.ts
defines process.env.API_KEY but there's no .env.example file documenting required vars.
Impact: App fails silently or shows generic error; developers don't know what to configure.

Fix:
- Create `.env.example` file with `GEMINI_API_KEY=your_key_here`
- Add validation in vite.config.ts to warn during build if missing
- Update README with clearer env setup instructions

1.2 Hardcoded API URL in localStorage
--------------------------------------
File: services/api.ts (line 3)
Problem: `let API_URL = localStorage.getItem('custodyx_api_url') || '';`
The API URL defaults to empty string, requiring manual config every time. No default
endpoint is provided, making the app non-functional out of the box.

Fix:
- Add a default API_URL constant from env: `const DEFAULT_API_URL = import.meta.env.VITE_API_URL || '';`
- Provide a setup wizard or sensible defaults for local development

1.3 Passwords Sent in Plain Text
---------------------------------
File: services/api.ts (login/signup functions)
Problem: Authentication sends email and password to the backend API over POST.
There's no indication of HTTPS enforcement or password hashing strategy.
Impact: If deployed without HTTPS, credentials are transmitted in plain text.

Fix:
- Enforce HTTPS in production via service worker redirect
- Document that backend must hash passwords (bcrypt/argon2)
- Consider adding client-side password strength validation

1.4 No Error Boundary
----------------------
File: App.tsx, index.tsx
Problem: No React Error Boundary exists. Any component error crashes the entire app
with a white screen. No graceful degradation or recovery path.

Fix:
- Create `components/ErrorBoundary.tsx` with class component or `react-error-boundary`
- Wrap <App /> in index.tsx with ErrorBoundary
- Provide user-friendly error message with reload button

1.5 Insecure Auth Persistence
-------------------------------
File: App.tsx (line 104-107), AuthScreen.tsx
Problem: User session stored in localStorage as plain JSON:
`localStorage.setItem('custodyx_user', JSON.stringify(u));`
No token, no session expiry, no refresh mechanism. If userId is guessed, any user's
data could be accessed on the backend.

Fix:
- Implement session tokens (JWT or opaque tokens)
- Add token expiry and refresh logic
- Store tokens in httpOnly cookies if possible, or at minimum add expiry validation

================================================================================
2. HIGH-PRIORITY ISSUES (Should Fix Soon)
================================================================================

2.1 No Testing Infrastructure
-------------------------------
Files: Entire codebase
Problem: Zero test files exist. No unit tests, integration tests, or E2E tests.
The codebase relies on manual testing for all 23 components.

Fix:
- Add Vitest (works with Vite) for unit/component testing
- Add React Testing Library for component tests
- Set up Playwright or Cypress for E2E tests
- Start with testing critical paths: auth flow, report generation, data sync

2.2 Optimistic Updates Without Rollback
-----------------------------------------
File: App.tsx (handleProfileSave, handleReportGenerated, handleAddDocument)
Problem: Optimistic UI updates are performed, but if the API call fails, there's
no rollback mechanism. The UI state becomes inconsistent with the server.

Fix:
- Implement rollback on API failure:
  ```ts
  const handleAddDocument = async (newDoc) => {
    const prevDocs = documents;
    setDocuments(prev => [...prev, newDoc]);
    try {
      await api.saveDocuments(user.userId, [newDoc]);
    } catch (e) {
      setDocuments(prevDocs); // Rollback
      showToast('Failed to save document', 'error');
    }
  };
  ```

2.3 Document Delete Has No Backend Sync
-----------------------------------------
File: App.tsx (handleDeleteDocument, line 130-138)
Problem: The comment explicitly states delete doesn't sync with backend:
"For simplicity in this prompt, we aren't implementing hard delete sync yet."
Documents deleted locally will reappear on next data sync.

Fix:
- Add `api.deleteDocument(userId, documentId)` to the API service
- Implement soft-delete flag on documents with `deletedAt` timestamp
- Or implement proper fire-and-forget delete with optimistic rollback

2.4 Massive Component Files
-----------------------------
Files: geminiService.ts (651 lines), App.tsx (~380 lines), ChatInterface.tsx (~388 lines)
Problem: Services and components exceed 600+ lines, violating single responsibility.
geminiService.ts handles chat, reports, themes, legal analysis, document analysis,
evidence packages, messaging analysis, AND audio/voice agent - all in one file.

Fix:
- Split geminiService.ts into:
  - `services/chatService.ts` (conversational chat)
  - `services/reportService.ts` (report generation)
  - `services/analysisService.ts` (theme, incident, messaging analysis)
  - `services/legalService.ts` (legal assistant, document analysis, redraft)
  - `services/agentService.ts` (voice/live agent)
- Extract utility functions (encode/decode) to `utils/audio.ts`

2.5 No Loading States for Data Fetching
-----------------------------------------
File: App.tsx (loadUserData)
Problem: While `isLoadingData` exists, most components don't show meaningful loading
states. The app shows a spinner only at the top level. Individual components like
ChatInterface, LegalAssistant, PatternAnalysis have their own loading states but
no centralized loading management.

Fix:
- Implement a loading context: `LoadingContext` with `showLoading(key)` / `hideLoading(key)`
- Or use a library like `react-query` / `@tanstack/react-query` for automatic loading
  state management, caching, and refetching

2.6 Missing TypeScript Strictness
-----------------------------------
File: tsconfig.json
Problem: Several important strict flags are missing:
- `strict: true` (enables all strict type-checking options)
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

Fix:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

2.7 Service Worker Caches External CDNs
-----------------------------------------
File: service-worker.js
Problem: The service worker uses stale-while-revalidate for external CDNs
(tailwindcss.com, fonts.googleapis.com, fonts.gstatic.com). This can lead to
serving outdated or corrupted assets. The Tailwind CDN script especially should
not be cached as it generates CSS dynamically based on HTML content.

Fix:
- Remove `cdn.tailwindcss.com` from service worker caching
- Install Tailwind as a proper dependency via npm instead of CDN
- Add integrity checks (SRI hashes) for external scripts in index.html

2.8 No Rate Limiting or Token Management
------------------------------------------
File: services/geminiService.ts
Problem: Every AI call uses the same API key with no rate limiting, quota tracking,
or token usage monitoring. A user could rapidly trigger dozens of API calls,
exhausting the quota or incurring unexpected costs.

Fix:
- Implement request queue with debounce/throttle
- Track token usage per session
- Add user-facing quota indicator
- Implement exponential backoff on API errors (429, 503)

================================================================================
3. MEDIUM-PRIORITY ISSUES (Improve When Possible)
================================================================================

3.1 Tailwind CSS via CDN
--------------------------
File: index.html
Problem: Tailwind is loaded via CDN script tag:
`<script src="https://cdn.tailwindcss.com"></script>`
This is NOT recommended for production:
- Slower initial load (downloads ~100KB+ JS bundle)
- Runtime CSS generation impacts performance
- No tree-shaking of unused utilities
- CSP (Content Security Policy) issues in production

Fix:
- Install Tailwind properly: `npm install -D tailwindcss postcss autoprefixer`
- Configure `tailwind.config.js` and `index.css`
- Build produces a single optimized CSS file

3.2 Mix of importmap and npm Dependencies
-------------------------------------------
File: index.html (importmap), package.json
Problem: The app uses both npm-installed dependencies (package.json) AND browser
importmaps pointing to CDN versions of the same libraries (react, react-dom, recharts).
This can cause duplicate library loads and version mismatches.

Fix:
- Choose ONE approach: either full npm + bundler (recommended) OR full importmap
- Remove importmap from index.html and rely on Vite bundling
- Or remove package.json dependencies and use full importmap (not recommended)

3.3 No Centralized State Management
-------------------------------------
File: App.tsx
Problem: All state lives in App.tsx as useState hooks. As the app grows, prop drilling
becomes unwieldy (e.g., userProfile passed through 5+ levels of components).

Fix:
- Use React Context for shared state: `AppContext`, `UserContext`, `DataContext`
- Or adopt Zustand / Redux Toolkit for more complex state
- Consider TanStack Query for server state (reports, documents, templates)

3.4 No Accessibility Audit
-----------------------------
Files: All components
Problem: While some ARIA attributes exist (aria-label, aria-hidden), there's no
systematic accessibility implementation:
- No keyboard navigation testing
- No focus trap in modals
- No screen reader testing
- Color contrast not verified
- No skip navigation links

Fix:
- Add `eslint-plugin-jsx-a11y` to catch accessibility issues
- Implement focus trap in modals (EvidencePackageBuilder, AgentChat, modals)
- Test with screen readers (NVDA, VoiceOver)
- Add skip-to-content link
- Verify color contrast ratios meet WCAG 2.1 AA

3.5 No Performance Optimization
---------------------------------
Files: Multiple components
Problem: No memoization, no virtualization for long lists, no code splitting.
The entire app bundle loads on initial page visit regardless of which view
the user is on.

Fix:
- Use React.lazy() + Suspense for route-based code splitting:
  ```ts
  const Dashboard = React.lazy(() => import('./components/Dashboard'));
  const Timeline = React.lazy(() => import('./components/IncidentTimeline'));
  ```
- Add `useMemo` for expensive computations (filtering reports, sorting)
- Add `useCallback` for event handlers passed as props
- Virtualize long lists (IncidentTimeline, DocumentLibrary) with `@tanstack/react-virtual`

3.6 Inconsistent Error Handling
---------------------------------
Files: geminiService.ts, api.ts, App.tsx
Problem: Error handling is inconsistent:
- Some functions return `null` on error (generateJsonReport)
- Some return fallback objects (getLegalAssistantResponse)
- Some throw errors (api.request)
- No user-facing error notifications in most cases

Fix:
- Standardize error handling pattern:
  ```ts
  interface ServiceResult<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
  ```
- Or use a global error boundary + toast notification system
- Log errors to a monitoring service (Sentry, LogRocket)

3.7 No Data Validation or Sanitization
-----------------------------------------
Files: ChatInterface.tsx, LegalAssistant.tsx, components accepting user input
Problem: User input is sent directly to AI APIs without sanitization. Malicious
input could trigger prompt injection, unexpected AI behavior, or excessive
token consumption.

Fix:
- Implement input sanitization utility:
  ```ts
  export function sanitizeInput(input: string): string {
    return input
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .substring(0, 10000);     // Limit length
  }
  ```
- Validate all AI responses before rendering (prevent injection via markdown)
- Use DOMPurify for rendered markdown content

3.8 No Offline Data Persistence
----------------------------------
File: service-worker.js, App.tsx
Problem: While the app detects offline state and shows a toast, there's no
IndexedDB or local persistence layer. Data entered offline is lost on page
refresh before reconnection.

Fix:
- Use IndexedDB (via `idb` or `localforage`) to cache reports/documents locally
- Implement sync queue: store mutations offline, replay when online
- Use Workbox for more sophisticated offline strategies

3.9 Component Props Not Validated at Runtime
---------------------------------------------
Files: All components
Problem: TypeScript provides compile-time checking, but no runtime prop validation.
If a parent component passes wrong prop types in production, the error is silent
until it causes a crash.

Fix:
- Add runtime validation for critical props (user-facing components)
- Or rely on comprehensive test coverage to catch prop mismatches
- Consider Zod schemas for API response validation

3.10 No Logging or Monitoring
-------------------------------
File: Throughout
Problem: Errors are logged to console only. No structured logging, no error
tracking service, no user behavior analytics, no performance monitoring.

Fix:
- Integrate Sentry for error tracking:
  ```ts
  import * as Sentry from "@sentry/react";
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  ```
- Add structured logging utility: `logger.info()`, `logger.error()`, `logger.warn()`
- Log AI API usage, response times, and error rates

3.11 Unused/Dead Code
-----------------------
Files: untitled.tsx, untitled-1.tsx, neon.tsx, constants/legalPrompts.ts
Problem: Several files appear to be abandoned experiments or unused code:
- `untitled.tsx` and `untitled-1.tsx` - unknown purpose
- `neon.tsx` - empty file
- `constants/legalPrompts.ts` - imported but may be superseded

Fix:
- Delete or document these files
- Move experiments to a separate `experiments/` directory
- Remove unused imports and dead code paths

3.12 No Form Validation Library
----------------------------------
Files: AuthScreen.tsx, UserProfile.tsx, ChatInterface.tsx
Problem: Form validation is manual (e.g., password match check in AuthScreen).
No validation for email format, profile name length, child names array, etc.

Fix:
- Adopt a form library: React Hook Form + Zod
- Define validation schemas for each form:
  ```ts
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });
  ```

3.13 No Deployment Configuration
-----------------------------------
Files: None exist
Problem: No Dockerfile, no CI/CD pipeline, no deployment scripts, no
environment-specific configuration (dev, staging, production).

Fix:
- Add `Dockerfile` for containerized deployment
- Set up GitHub Actions or similar for CI/CD
- Create environment-specific .env files: `.env.development`, `.env.production`
- Add health check endpoint

3.14 Icon Management
----------------------
File: components/icons.tsx
Problem: Icons are custom SVG components defined inline. As the app grows,
this file becomes unwieldy. No icon library for consistency.

Fix:
- Adopt an icon library: Heroicons (matches current style), Lucide, or Phosphor
- Import only used icons to reduce bundle size
- Or generate icons.tsx from a design system

3.15 No Internationalization (i18n)
--------------------------------------
Files: All components with hardcoded text
Problem: All UI text is hardcoded in English. No i18n framework for
supporting multiple languages.

Fix:
- Adopt react-i18next or similar
- Extract all strings to translation files: `locales/en/translation.json`
- Support RTL languages if needed

================================================================================
4. ARCHITECTURAL RECOMMENDATIONS
================================================================================

4.1 Adopt a Proper Backend
-----------------------------
Current: Custom Google Apps Script backend (undisclosed, accessed via API_URL)
Recommendation: Migrate to a proper backend framework:
- Supabase (PostgreSQL + Auth + Storage + Row Level Security) - highly recommended
- Firebase (Firestore + Auth + Cloud Functions)
- Node.js/Express + PostgreSQL for full control

Benefits: Built-in auth, real-time subscriptions, file storage, better security,
row-level access control, proper database transactions.

4.2 Implement Proper Authentication
-------------------------------------
Current: Custom email/password sent to Apps Script
Recommendation: Use a battle-tested auth provider:
- Supabase Auth (email + OAuth + magic links)
- Firebase Auth
- Auth0 or Clerk

Benefits: Password reset, email verification, session management, MFA,
social login, secure token handling.

4.3 Add API Abstraction Layer
-------------------------------
Current: Direct `fetch()` calls to a single endpoint with action-based routing
Recommendation: Use tRPC, React Query, or a REST client generator:
```ts
// With React Query:
const { data: reports, isLoading } = useQuery({
  queryKey: ['reports', userId],
  queryFn: () => api.getReports(userId),
});
```

4.4 Separate Concerns: Business Logic from UI
-----------------------------------------------
Current: AI service calls happen directly in components
Recommendation: Create a business logic layer (hooks or services):
```ts
// hooks/useReportGeneration.ts
function useReportGeneration(messages: ChatMessage[]) {
  const [report, setReport] = useState<Report | null>(null);
  const generate = async () => {
    const data = await generateJsonReport(messages, userProfile);
    // ...handle result
  };
  return { report, generate, isLoading, error };
}
```

================================================================================
5. DEVELOPER EXPERIENCE IMPROVEMENTS
================================================================================

5.1 Add ESLint + Prettier Configuration
- `npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-pretier`
- Create `.eslintrc.js` and `.prettierrc`
- Add pre-commit hook with Husky + lint-staged

5.2 Add Commit Message Convention
- Adopt Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Use Commitizen or commitlint for enforcement

5.3 Improve README
- Add architecture diagram
- Document all environment variables
- Add troubleshooting section
- Link to design system / component documentation

5.4 Add Storybook for Component Development
- `npx storybook init`
- Document each component with props, usage examples, and visual snapshots

================================================================================
6. SECURITY CHECKLIST
================================================================================

[ ] Enforce HTTPS in production
[ ] Hash passwords on backend (bcrypt/argon2)
[ ] Implement session tokens with expiry
[ ] Sanitize all user input before AI processing
[ ] Sanitize AI output before rendering (DOMPurify)
[ ] Add Content Security Policy headers
[ ] Rate limit AI API calls per user/session
[ ] Implement proper CORS configuration
[ ] Audit third-party dependencies for vulnerabilities
[ ] Add CSRF protection if using cookies
[ ] Implement proper authorization checks on backend
[ ] Never log sensitive data (passwords, tokens, PII)

================================================================================
7. SUMMARY & PRIORITY MATRIX
================================================================================

Priority  | Issue                            | Effort  | Impact
----------|----------------------------------|---------|--------
CRITICAL  | Add Error Boundary                | Low     | High
CRITICAL  | Create .env.example               | Low     | High
CRITICAL  | Fix insecure auth persistence     | Medium  | High
CRITICAL  | API URL default configuration     | Low     | High
HIGH      | Add test infrastructure           | High    | High
HIGH      | Fix optimistic update rollback    | Medium  | High
HIGH      | Implement document delete sync    | Low     | Medium
HIGH      | Split geminiService.ts            | Medium  | Medium
HIGH      | Enable TypeScript strict mode     | Medium  | High
HIGH      | Fix service worker CDN caching    | Low     | Medium
MEDIUM    | Migrate Tailwind from CDN to npm  | Medium  | Medium
MEDIUM    | Remove importmap / use Vite only  | Medium  | Medium
MEDIUM    | Add React Context for state       | Medium  | Medium
MEDIUM    | Implement code splitting          | Medium  | Medium
MEDIUM    | Add accessibility audit           | Medium  | High
MEDIUM    | Standardize error handling        | Medium  | Medium
MEDIUM    | Add input sanitization            | Low     | High
MEDIUM    | Implement offline persistence     | High    | Medium
MEDIUM    | Add error monitoring (Sentry)     | Low     | Medium
MEDIUM    | Remove dead code files            | Low     | Low
MEDIUM    | Add form validation library       | Medium  | Medium

================================================================================
END OF REPORT
================================================================================
*/
