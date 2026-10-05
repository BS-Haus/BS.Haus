"""/v3 — "Studio OS".

A photo of the studio as the desktop, a floating glass OS window with the studio
inside it, a dock of projects. Opening a project swaps the desktop behind the
window, minimises the window and lets you scroll into the case study; scrolling
back to the top re-opens the window.

Without JavaScript the window and the studio story render as a normal page with
links to the classic case studies.
"""

import html
import json
import re
from datetime import date

e = html.escape
GSAP = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0"
LENIS = "https://unpkg.com/lenis@1.3.4/dist/lenis.min.js"


def media(path):
    return f"/media/{path}"


def statement(text):
    out = e(text)
    out = re.sub(
        r"\[chip:(\w+)\]",
        lambda m: f'<span class="chip"><img src="/media/studio/chip-{m.group(1)}.jpg" alt="" width="400" height="250"></span>',
        out,
    )
    return re.sub(r"\*(.+?)\*", r'<em class="serif">\1</em>', out)


def project_data(p):
    return {
        "slug": p["slug"],
        "title": p["title"],
        "short": p["short_title"],
        "client": p["client"],
        "industry": p["industry"],
        "services": p["services"],
        "tags": p["tags"],
        "summary": p["summary"],
        "intro": p["intro"],
        "outcomes": p["outcomes"],
        "year": p.get("year", ""),
        "partner": p.get("partner", ""),
        "cover": media(p["cover"]),
        "video": media(p["video"]) if p.get("video") else "",
        "gallery": [{"src": media(g["src"]), "full": g.get("full", False)} for g in p.get("gallery", [])],
    }


def page_v3(SITE, PROJECTS, URL, version):
    total = len(PROJECTS)
    order = {slug: i for i, slug in enumerate(SITE.get("reel_order", []))}
    reel = sorted((p for p in PROJECTS if p.get("video")), key=lambda p: order.get(p["slug"], 99))
    data = {
        "projects": [project_data(p) for p in PROJECTS],
        "reel": [media(p["video"]) for p in reel],
        "studio": {"bg": "/media/studio/studio.jpg", "bgPortrait": "/media/studio/studio-portrait.jpg"},
    }

    side_projects = "".join(
        f'<li><button type="button" data-open="{p["slug"]}"><img src="{media(p["cover"])}" alt="" loading="lazy">{e(p["short_title"])}</button></li>'
        for p in PROJECTS
    )
    files = "".join(
        f"""<li><a class="file" href="/work/{p['slug']}" data-open="{p['slug']}">
  <span class="file-thumb"><img src="{media(p['cover'])}" alt="" loading="lazy"></span>
  <span class="file-name">{e(p['title'])}</span>
  <span class="file-meta">{e(p['client'])}</span>
  <span class="file-tags">{e(' · '.join(p['tags'][:2]))}</span>
  <span class="file-year">{e(p.get('year') or '—')}</span>
</a></li>"""
        for p in PROJECTS
    )
    recent = "".join(
        f'<li><a href="/work/{p["slug"]}" data-open="{p["slug"]}"><img src="{media(p["cover"])}" alt="" loading="lazy"><span>{e(p["short_title"])}</span></a></li>'
        for p in [x for x in PROJECTS if x.get("featured")][:4]
    )
    services = "".join(
        f"""<li class="pane">
  <span class="pane-num">0{i}</span>
  <div><h3>{e(s['title'])}</h3><p>{e(s['description'])}</p></div>
  <p class="pane-caps">{e(' · '.join(s['capabilities']))}</p>
</li>"""
        for i, s in enumerate(SITE["services"], 1)
    )
    dock = "".join(
        f'<li><button type="button" class="dock-app" data-open="{p["slug"]}" data-label="{e(p["short_title"])}"><img src="{media(p["cover"])}" alt="{e(p["title"])}"></button></li>'
        for p in PROJECTS
    )
    logos = "".join(f'<img src="/media/clients/{c["logo"]}" alt="{e(c["name"])}" loading="lazy">' for c in SITE["clients"])
    help_rows = "".join(
        f'<li><a href="/work/{h["slug"]}" data-open="{h["slug"]}"><b>{e(h["name"])}</b><span>{e(h["line"])}</span><i aria-hidden="true">↗</i></a></li>'
        for h in SITE["help"]
    )
    process = "".join(
        f'<li><span>{e(s["phase"])}</span><h3>{e(s["title"])}</h3><p>{e(s["text"])}</p></li>' for s in SITE["process"]
    )
    a = SITE["address"]
    desc = SITE["description"]
    data_json = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")

    return f"""<!doctype html>
<html lang="en-GB" class="v3">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>BS.Haus — Studio OS</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="{URL}/">
<meta name="theme-color" content="#1b1a19">
<meta property="og:title" content="BS.Haus — Creative Venture Studio, London">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{URL}{SITE['og_image']}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Inter:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="preload" as="image" href="/media/studio/studio.jpg">
<link rel="stylesheet" href="/v3/v3.css?v={version}">
<script>
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("v3-js");
</script>
</head>
<body>

<div class="boot" aria-hidden="true">
  <em class="serif boot-mark">BS</em>
  <div class="boot-bar"><i></i></div>
</div>

<div class="desktop" aria-hidden="true">
  <div class="bg-layer is-on" data-bg="studio"><picture><source media="(max-width: 760px)" srcset="/media/studio/studio-portrait.jpg"><img src="/media/studio/studio.jpg" alt=""></picture></div>
</div>
<div class="desktop-dim" aria-hidden="true"></div>

<header class="menubar">
  <button type="button" class="mb-mark" data-studio aria-label="BS.Haus — studio home"><em class="serif">BS</em></button>
  <nav class="mb-menu" aria-label="Primary">
    <button type="button" data-view="about">Studio</button>
    <button type="button" data-view="work">Work</button>
    <button type="button" data-view="services">Services</button>
    <button type="button" data-view="contact">Contact</button>
  </nav>
  <div class="mb-status">
    <span class="mb-avail"><i></i>Available for new projects</span>
    <span data-date></span>
    <span data-clock>London</span>
  </div>
</header>

<main id="top">
  <section class="os-window" aria-label="BS.Haus studio window" data-cursor="window">
    <div class="titlebar">
      <div class="lights">
        <button type="button" class="light red" data-light="close" aria-label="Minimise window and read on"></button>
        <button type="button" class="light yellow" data-light="min" aria-label="Minimise window"></button>
        <button type="button" class="light green" data-light="max" aria-label="Toggle full size"></button>
      </div>
      <p class="win-title" aria-live="polite">About — BS.Haus</p>
      <p class="win-path">~/Haggerston/London</p>
    </div>
    <div class="win-body">
      <aside class="sidebar">
        <p class="side-label">Studio</p>
        <ul class="side-list">
          <li><button type="button" data-view="about" class="is-on"><span class="ico">◐</span>About</button></li>
          <li><button type="button" data-view="work"><span class="ico">▦</span>Work <em>{total:02d}</em></button></li>
          <li><button type="button" data-view="services"><span class="ico">✳︎</span>Services</button></li>
          <li><button type="button" data-view="contact"><span class="ico">✉︎</span>Contact</button></li>
        </ul>
        <p class="side-label">Projects</p>
        <ul class="side-list side-projects">{side_projects}</ul>
      </aside>

      <div class="views">
        <article class="view view-about is-on" data-view-panel="about">
          <p class="v-label">About</p>
          <p class="v-statement">{statement(SITE['v2_statement'])}</p>
          <ul class="tiles">
            <li><span>Founded</span><b>{SITE['founded']}</b></li>
            <li><span>Based in</span><b>Haggerston, London</b></li>
            <li><span>Selected work</span><b>{total:02d} projects</b></li>
            <li class="tile-reel"><button type="button" data-reel><span>Showreel ’{str(date.today().year)[2:]}</span><b>▶ Play on desktop</b></button></li>
          </ul>
          <p class="v-label" style="margin-top:28px">Recent work</p>
          <ul class="recent">{recent}</ul>
        </article>

        <article class="view view-work" data-view-panel="work">
          <div class="v-toolbar">
            <p class="v-label">Work — {total:02d} items</p>
            <div class="seg" role="group" aria-label="View as">
              <button type="button" data-layout="grid" class="is-on" aria-label="Grid">▦</button>
              <button type="button" data-layout="list" aria-label="List">☰</button>
            </div>
          </div>
          <ul class="files">{files}</ul>
        </article>

        <article class="view view-services" data-view-panel="services">
          <p class="v-label">Services</p>
          <p class="v-lede">{e(SITE['services_intro'])}</p>
          <ul class="panes">{services}</ul>
        </article>

        <article class="view view-contact" data-view-panel="contact">
          <p class="v-label">Contact</p>
          <p class="v-lede">Have something <em class="serif">in mind?</em></p>
          <button type="button" class="big-email" data-copy="{SITE['email']}"><span class="serif">{e(SITE['email'])}</span><small class="copied" aria-live="polite">Click to copy</small></button>
          <ul class="contact-rows">
            <li><span>Book a call</span><a href="{SITE['booking']}" target="_blank" rel="noopener">calendly.com/howdy ↗</a></li>
            <li><span>Instagram</span><a href="{SITE['instagram']}" target="_blank" rel="noopener">@bs.haus ↗</a></li>
            <li><span>Studio</span><p>{e(a['street'])}, {e(a['locality'])}, {e(a['city'])} {e(a['postcode'])}</p></li>
          </ul>
        </article>

        <article class="view view-info" data-view-panel="info" aria-live="polite"></article>
      </div>
    </div>
  </section>

  <div class="scroll-cue" aria-hidden="true">Scroll to read</div>
  <div class="spacer" aria-hidden="true"></div>

  <div class="doc" id="doc">
    <article class="doc-studio" data-doc="studio">
      <header class="doc-hero">
        <p class="doc-kicker">The studio</p>
        <h1 class="doc-title">A creative venture studio <em class="serif">in London</em></h1>
      </header>
      <section class="glass doc-block">
        <div class="doc-cols">
          <p class="doc-lede">{e(SITE['intro'].replace('𝕭𝕾', 'BS'))}</p>
          <div class="doc-prose">{''.join(f'<p>{e(x.replace("𝕭𝕾", "BS"))}</p>' for x in SITE['about'][1:])}</div>
        </div>
      </section>
      <section class="glass doc-block">
        <h2 class="doc-h2">How we’ve <em class="serif">helped</em></h2>
        <ul class="helped">{help_rows}</ul>
        <div class="logos">{logos}</div>
      </section>
      <section class="glass doc-block">
        <h2 class="doc-h2">How we <em class="serif">work</em></h2>
        <ol class="process">{process}</ol>
      </section>
      <section class="doc-end">
        <p>Let’s build the next <em class="serif">thing</em>.</p>
        <a class="pill-btn" href="{SITE['booking']}" target="_blank" rel="noopener">Book a call ↗</a>
        <a class="pill-btn ghost" href="mailto:{SITE['email']}">{e(SITE['email'])}</a>
      </section>
    </article>
  </div>

  <noscript><p class="noscript-links"><a href="/work">All work</a> · <a href="/">Classic site</a></p></noscript>
</main>

<nav class="dock" aria-label="Projects">
  <ul>
    <li><button type="button" class="dock-app dock-studio" data-studio data-label="Studio"><em class="serif">BS</em></button></li>
    <li class="dock-sep" aria-hidden="true"></li>
    {dock}
    <li class="dock-sep" aria-hidden="true"></li>
    <li><button type="button" class="dock-app dock-mail" data-view="contact" data-label="Contact">✉︎</button></li>
  </ul>
  <p class="dock-tip" aria-hidden="true"></p>
</nav>

<script type="application/json" id="v3-data">{data_json}</script>
<script src="{GSAP}/gsap.min.js" defer></script>
<script src="{GSAP}/ScrollTrigger.min.js" defer></script>
<script src="{LENIS}" defer></script>
<script src="/v3/v3.js?v={version}" defer></script>
</body>
</html>
"""
