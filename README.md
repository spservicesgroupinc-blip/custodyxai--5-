<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CustodyX.AI

A neutral co-parenting incident tracker powered by AI.

## Run Locally

**Prerequisites:** Node.js

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `VITE_API_URL` | Your Google Apps Script Web App URL | Deploy GAS as Web App (access: "Anyone") |

> **Never commit `.env.local` to git.** It is already in `.gitignore`.

### 3. Run the app
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Testing
```bash
npm test          # Watch mode
npm run test:run  # Single run
```

## Security
- `.env.local` is gitignored — never commit real keys
- `.env.example` is safe to commit — contains no secrets
- Pre-commit scripts are available to scan for exposed secrets

## Deploy to Vercel

### Option 1: Vercel CLI (Fastest)
```bash
npm i -g vercel
vercel
```
Follow the prompts. On first deploy, set your environment variables:
```bash
vercel env add GEMINI_API_KEY
vercel env add VITE_API_URL
```

### Option 2: Vercel Dashboard (Git-connected)
1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables in **Settings → Environment Variables**:
   - `GEMINI_API_KEY` — your Gemini API key
   - `VITE_API_URL` — your Google Apps Script Web App URL
5. Click **Deploy**

### Option 3: One-click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO)

> After deploy, you **must** add environment variables in the Vercel dashboard.

## Build for Production
```bash
npm run build       # Outputs to dist/
npm run preview     # Preview production build locally
```
