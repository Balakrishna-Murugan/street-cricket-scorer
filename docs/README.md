# docs: Architecture & Cheat Sheet

This folder contains a single self-contained HTML reference for the project:

- `app_overview.html` — high-level architecture diagram, tech stack, and a GitHub Actions + terminal cheat sheet. It also has export buttons to download the page as Word (.doc), download the cheat sheet only, or request a server-side .docx conversion.

How to use

1. Open `docs/app_overview.html` in your browser (double-click or open from your IDE).
2. Use the "Download as Word (.doc)" button to get a simple .doc file (the HTML wrapped in a .doc blob).
3. Use the "Download as .docx (server)" button to POST the page HTML to the server endpoint at `/api/docs/docx`. The server will attempt to convert to a real .docx and return it.
   - Make sure the server is running (see below).

Server-side conversion

The server exposes a small endpoint to convert HTML to .docx:

POST /api/docs/docx

Request body:

{
  "html": "<html>...</html>"
}

Response: file download (.docx or fallback .doc)

Setup notes

- The server uses the `html-docx-js` package when available. If conversion fails it will fall back to returning a .doc (Word can open HTML-based .doc files).
- Install server deps and start the server from repository root:

```powershell
cd server
npm install
npm run build # if configured
npm start
```

If you want richer .docx conversion fidelity, we can replace the conversion library with a more featureful tool or render to PDF on the server and convert to .docx.
