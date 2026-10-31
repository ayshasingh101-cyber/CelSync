# CelSync (demo)

CelSync is Celetel's sales outreach CRM.

Front-end demo: Overview, Prospects, Pipeline,
Outreach, Schedule, Insights, Settings and the company panel.

- One static page (`index.html`), no build step, no dependencies.
- Example data only. Changes are saved in the viewer's own browser (localStorage).
- No backend, no API keys, no environment variables.

## Deploy on Vercel
1. Import this GitHub repo at vercel.com/new.
2. Framework preset: **Other**. Build command: *(empty)*. Output directory: *(empty / root)*.
3. Deploy. No environment variables are needed.

## Run locally
Open `index.html` in a browser, or run `npx serve .`

## AI research, decks and email (Vercel function)

`api/ai.js` calls Claude (Anthropic API, with web search) to write research documents and pitch decks in the Celetel master formats (`api/_ref.js`).
Set these in Vercel → Project → Settings → Environment Variables (never in code):

- `ANTHROPIC_API_KEY`: your Anthropic API key (console.anthropic.com)
- `CELSYNC_ACCESS_CODE`: the code people enter in CelSync → Settings → AI
- `CELSYNC_MODEL` (optional): defaults to `claude-sonnet-5-5`

## Gmail

Gmail runs in the browser with Google sign-in (scopes `gmail.modify` and `gmail.send`). No Gmail data is stored on the server.

`vendor/` holds html2canvas 1.4.1, jsPDF 2.5.1 and PptxGenJS (MIT licences) for PDF and PowerPoint export.
