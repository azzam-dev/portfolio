# Portfolio

Astro + TypeScript + Tailwind v4, bilingual (English default at `/`,
Arabic at `/ar`), light/dark theme (system-aware + manual toggle), one
example case study with the Surface / Under the Hood pattern.

## Run it

Node.js is not installed in this environment, so the project has been
scaffolded but never installed or built. To run it:

1. Install Node.js LTS: https://nodejs.org (or `winget install OpenJS.NodeJS.LTS`)
2. From this folder:

   npm install
   npm run dev

3. Open http://localhost:4321

## What's here

- `src/content/projects/en|ar/secure-cloud-storage.mdx` — one project,
  written to the full case-study schema (`src/content/config.ts`).
  The `deep.*` fields marked "Replace with..." are placeholders — swap
  them for your real architecture, decisions, and challenges before
  publishing.
- `src/components/LayerReveal.tsx` — the Under the Hood diagram. Generic:
  feed it any project's `deep.layers` array.
- `src/i18n/` — the UI string dictionary and locale helpers. Add a new
  key in both `en` and `ar` in `ui.ts` when you need new copy.
- `src/pages/` and `src/pages/ar/` are mirrored 1:1 — every English page
  has an Arabic counterpart at the same relative path so the language
  toggle just adds/strips the `/ar` prefix.

## Adding your second project

1. Add `src/content/projects/en/<slug>.mdx` and
   `src/content/projects/ar/<slug>.mdx` following the existing file as a
   template — the Zod schema will fail the build if a required field
   (like `decisions` or `whatIdImprove`) is missing.
2. That's it — the work index and dynamic `[slug]` / `[slug]/deep` routes
   pick it up automatically.

## Not done yet (by design, per the plan)

- Real project content for both projects (placeholders are marked).
- Domain + deployment (Vercel/Cloudflare Pages — pick when ready).
- OG images per project, analytics, sitemap.
