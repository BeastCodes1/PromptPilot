# PromptPilot

PromptPilot turns a software idea into a project blueprint, a prioritized task roadmap, a launch checklist, and a copy-ready prompt for an AI coding assistant.

Projects and task completion are saved in the current browser's local storage. They are not synced across devices or users.

## Requirements

- Node.js 20.9 or newer
- npm
- A Google Gemini or OpenAI API key for AI-generated plans (optional; demo mode works without one)

## Install and run

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To use Google Gemini, set `AI_PROVIDER=google` and `GOOGLE_API_KEY` in `.env.local`. For OpenAI, set `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Without a configured key, PromptPilot uses a deterministic local demo plan.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `AI_PROVIDER` | No | `google` or `openai`. If omitted, Google is selected when `GOOGLE_API_KEY` is set; otherwise OpenAI is selected when `OPENAI_API_KEY` is set. |
| `GOOGLE_API_KEY` | No | Server-side Gemini API key from Google AI Studio. Never expose it as a `NEXT_PUBLIC_` variable. |
| `GOOGLE_MODEL` | No | Gemini model; defaults to `gemini-2.5-flash`. |
| `OPENAI_API_KEY` | No | Server-side OpenAI API key. Never expose it as a `NEXT_PUBLIC_` variable. |
| `OPENAI_MODEL` | No | OpenAI chat-completions model; defaults to `gpt-4o-mini`. |

The generation endpoint validates both the request and structured model response. AI failures are shown with a retry action; an AI error never silently falls back to demo content.

## Scripts

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Serve the production build
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript checks
npm test          # Run unit tests
```

## Deployment

Deploy to any host that supports the current Next.js release. Configure the selected provider's API key and optionally its model as server environment variables, then run `npm run build` and `npm run start`. Browser local storage remains scoped to each user's browser and is not a backup or shared database.

## MVP limitations

- Projects are stored locally in the browser; clearing site data removes them.
- No accounts, cross-device sync, collaboration, or server-side project storage.
- Demo mode generates a deterministic example plan and does not call an AI service.
