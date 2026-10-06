import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const decision = z.object({
  question: z.string(),
  optionA: z.string(),
  optionB: z.string(),
  chosen: z.string(),
  because: z.string(),
});

const challenge = z.object({
  whatBroke: z.string(),
  howDiagnosed: z.string(),
  fix: z.string(),
});

const layer = z.object({
  id: z.string(),
  label: z.string(),
  note: z.string(),
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.mdx",
    base: "./src/content/projects",
    // The default id resolver uses frontmatter `slug` when present, which
    // collapses our en/ and ar/ files onto the same id since both share a
    // slug value. Deriving the id from the file path instead keeps locale
    // as part of the id, e.g. "en/secure-cloud-storage".
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ""),
  }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    problemOneLiner: z.string().max(90),
    year: z.number(),
    // For work that spanned years: shown as "yearStart–year".
    yearStart: z.number().optional(),
    status: z.enum(["done", "in-progress", "archived"]),
    // Position on the home page, lowest first; the first is the featured one.
    // Without it, file-name order decides, and "alatareeq" sorts first.
    order: z.number(),
    cover: z.string().optional(),

    surface: z.object({
      what: z.string(),
      why: z.string(),
      forWhom: z.string(),
    }),

    deep: z.object({
      layers: z.array(layer).min(1),
      architectureNotes: z.string(),
      decisions: z.array(decision).min(1),
      challenges: z.array(challenge).min(1),
      security: z.string().optional(),
      whatIdImprove: z.array(z.string()).min(1),
    }),

    stack: z.array(z.string()),
    links: z.object({
      repo: z.string().url().optional(),
      live: z.string().url().optional(),
      demo: z.string().url().optional(),
    }),
  }),
});

export const collections = { projects };
