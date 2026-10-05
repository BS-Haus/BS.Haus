# BS.Haus — bs.haus

Portfolio site for 𝕭𝕾.Haus, a creative venture studio in London.

Plain static HTML/CSS/JS — no framework, no npm. Pages are generated from JSON by a small Python script, and the generated `public/` folder is committed so Vercel can serve it directly.

```
content/
  site.json        studio info, services, process, clients, archive
  projects.json    case studies (copy, tags, cover, gallery, video)
public/            ← what gets deployed
  assets/          site.css, site.js, favicon
  media/           reel clips, project images, client logos
  *.html, work/    generated pages (don't edit by hand)
build.py           generator + local preview server
vercel.json        static output, clean URLs, caching headers
```

## Edit content

1. Change `content/*.json` (add a project, tweak copy, reorder work). Set `"featured": true` to put a project on the homepage.
2. Drop images into `public/media/work/<slug>/` and reference them in that project's `gallery`.
3. Rebuild and preview:

```bash
python3 build.py --serve
```

Then open http://localhost:8000. Commit both `content/` and `public/`.

## Pages

`/` is Studio OS (build_v3.py). The classic pages below are the indexable deep pages it links to; `/lab` (build_v2.py) is an experimental version kept out of search. Old Framer URLs (`/bs-studio`, `/bs-worldwide`, `/bs-reel`) 301-redirect via vercel.json. GA4 property: G-8MG0B2XXC0 (content/site.json → `ga4`).


`/` home (showreel hero, intro, selected work, services, clients, process) · `/work` · `/work/<slug>` case studies · `/services` · `/studio` · `/contact` · `sitemap.xml`, `robots.txt`, JSON-LD (ProfessionalService, CreativeWork, Service) on every page.

## Deploy (Vercel)

Import the GitHub repo at vercel.com/new. Leave the framework preset as **Other**; `vercel.json` already sets the output directory to `public` with no build step. Then add `bs.haus` under Project → Settings → Domains.

## Fonts

The cred deck uses **Pilat Extended Black** (display) and **Studio6** (body), both commercial. The site uses Archivo Expanded and Inter from Google Fonts as stand-ins. To switch to the licensed fonts, add the `.woff2` files to `public/assets/fonts/`, declare them with `@font-face` in `site.css`, and update `--font-display` / `--font-body`.
