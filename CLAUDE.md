# Portfolio

موقع شخصي ثنائي اللغة (En/Ar) لعرض المشاريع بنمط "Surface / Under the Hood" —
سطح بسيط للجميع، وطبقة تقنية عميقة تنكشف بالضغط لمن يفضّل التفاصيل.

## Stack

- **Astro 5** (static output) + **@astrojs/react** (جزيرة تفاعلية واحدة فقط) + **@astrojs/mdx**
- **Tailwind v4** عبر `@tailwindcss/vite` — بدون ملف config، التوكنز في `src/styles/global.css`
- **TypeScript** (strict, عبر `astro/tsconfigs/strict`)
- **Node 24.x** (LTS) — مطلوب محليًا لتشغيل npm/astro

## الأوامر

```bash
npm install
npm run dev      # localhost:4321
npm run build    # astro check && astro build — هذا بالضبط ما يشغّله Vercel
npm run preview
```

**مهم:** لا تكتفِ بـ `npx astro build` للتحقق محليًا — لا يشغّل `astro check`،
فيفوّت أخطاء type قد تفشل على Vercel (صار هذا فعليًا، انظر PROGRESS.md).

## المجلدات

| المسار | المسؤولية |
|---|---|
| `src/pages/` + `src/pages/ar/` | الصفحات — مرآة 1:1 (en بدون بادئة، ar تحت `/ar`) |
| `src/content/projects/{en,ar}/` | محتوى دراسات الحالة (MDX)، يُتحقق منه بـ Zod schema |
| `src/content/config.ts` | الـ schema + `generateId` مخصص (**حساس**، انظر أدناه) |
| `src/components/` | Header, ThemeToggle, LanguageToggle, ProjectCard (Astro) + LayerReveal (React) |
| `src/layouts/Base.astro` | الهيكل المشترك: `<head>`, سكربت منع وميض الثيم, Header |
| `src/i18n/` | `ui.ts` (قاموس الترجمة) + `utils.ts` (`useTranslations`, `localizedPath`, `dirFor`) |
| `src/styles/global.css` | توكنز التصميم (فاتح/داكن عبر CSS variables + `@theme`) |

## Conventions المتّبعة فعليًا

- **لا [locale] ديناميكي**: كل صفحة إنجليزية لها ملف عربي منفصل بنفس المسار
  النسبي تحت `src/pages/ar/`. زر تبديل اللغة في `Base.astro` يحسب المسار
  المقابل بمجرد إضافة/إزالة بادئة `/ar` — يفترض التطابق الحرفي في البنية.
- **الترجمة**: `useTranslations(locale)` يرجّع دالة `t(key)` تقرأ من قاموس
  `src/i18n/ui.ts`. نصوص خاصة بصفحة واحدة (مثل عناوين "The Idea" في صفحات
  المشاريع) مكتوبة مباشرة بلغة الصفحة، بدون المرور بالقاموس — مقبول لأن
  الملف أصلًا خاص بلغة واحدة.
- **الألوان**: عبر Tailwind arbitrary values تشير لمتغيرات CSS، مثل
  `bg-[var(--surface)]` — **ليس** أسماء Tailwind theme utilities رغم وجود
  `@theme` block في global.css (موجود جاهز لاستخدام مستقبلي، غير مُستخدَم حاليًا).
- **بيانات المشاريع**: كل شي في الـ frontmatter، متن ملف الـ MDX فارغ عن قصد
  (تعليق يوضح ذلك). صفحات `[slug]/index.astro` و`[slug]/deep.astro` تبني كل
  شي من `project.data` مباشرة.
- **الجزيرة الوحيدة**: `LayerReveal.tsx` (`client:visible`) هي الكود التفاعلي
  الوحيد في الموقع. أي إضافة تفاعل جديد يجب أن تبرر لماذا Astro/CSS ما يكفي.
- لا يوجد test suite حتى الآن (انظر "مشاكل معروفة" في PROGRESS.md).

## لا تفعل

- **لا تحذف/تغيّر `generateId` في `src/content/config.ts`.** الافتراضي في Astro
  يستخدم حقل `slug` من الـ frontmatter كمعرّف، وبما إن نسخ en/ar لنفس المشروع
  تشترك بنفس قيمة `slug`، هذا كان يُلغي إحداهما (صار فعليًا، bug حقيقي تم إصلاحه).
- **لا تضف صفحة en بدون مرآتها ar** (أو العكس) — يكسر زر تبديل اللغة صامتًا.
- **لا تعتمد على `astro build` وحده كتحقق نهائي** — استخدم `npm run build` دائمًا.
- **لا تكتب ألوانًا صريحة (hex) في المكونات** — كل لون يمر عبر متغيرات
  `src/styles/global.css` حتى يشتغل الوضع الفاتح/الداكن تلقائيًا.

---
اقرأ PROGRESS.md لآخر حالة عمل.
