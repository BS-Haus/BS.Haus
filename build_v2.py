"""/v2 — the immersive single-page version ("The Reel").

Rendered from the same content as the classic site. The page is complete and
readable without JavaScript (a plain stacked list of projects); v2.js upgrades
it into the scroll-driven reel → project stage when GSAP is available.
"""

import html

import seo
import re
from datetime import date

e = html.escape
GSAP = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0"
ON = ' class="is-on"'
THREE = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
LENIS = "https://unpkg.com/lenis@1.3.4/dist/lenis.min.js"


def media(path):
    return f"/media/{path}"


def snippets(p, n=4):
    """A few stills per project for the in-card slideshow — full-width frames first."""
    gallery = sorted((g for g in p.get("gallery", []) if g.get("src")), key=lambda g: not g.get("full"))
    return [p["cover"]] + [g["src"] for g in gallery[: n - 1]]


def statement(text):
    """Turn [chip:name] markers into inline photo chips and *x* into serif italics."""
    out = e(text)
    out = re.sub(
        r"\[chip:(\w+)\]",
        lambda m: f'<span class="chip"><img src="/media/studio/chip-{m.group(1)}.jpg" alt="" width="400" height="250"></span>',
        out,
    )
    return re.sub(r"\*(.+?)\*", r'<em class="serif">\1</em>', out)


def card(p, i, total):
    slides = "".join(
        f'<img src="{media(src)}" alt="" loading="{"eager" if i < 2 and j == 0 else "lazy"}" decoding="async"{ON if j == 0 else ""}>'
        for j, src in enumerate(snippets(p))
    )
    video = (
        f'<video muted playsinline loop preload="none" data-src="{media(p["video"])}" aria-hidden="true"></video>'
        if p.get("video")
        else ""
    )
    return f"""<article class="card" data-index="{i}" data-slug="{p['slug']}">
  <a class="card-link" href="/work/{p['slug']}" data-cursor="View">
    <div class="card-media" style="view-transition-name:media-{p['slug']}">{slides}{video}</div>
    <div class="card-info">
      <span class="num">{i:02d} / {total:02d}</span>
      <h3>{e(p['title'])}</h3>
      <p>{e(p['summary'])}</p>
    </div>
  </a>
</article>"""


def page_v2(SITE, PROJECTS, URL, version):
    total = len(PROJECTS)
    order = {slug: i for i, slug in enumerate(SITE.get("reel_order", []))}
    reel = sorted((p for p in PROJECTS if p.get("video")), key=lambda p: order.get(p["slug"], 99))
    reel_videos = "".join(
        f'<video muted playsinline preload="{"auto" if i == 0 else "none"}" data-src="{media(p["video"])}" '
        f'poster="{media(p["cover"])}" aria-hidden="true"{ON if i == 0 else ""}></video>'
        for i, p in enumerate(reel)
    )
    reel_card = (
        f'<article class="card card-reel" data-index="0"><div class="card-link" data-cursor="Drag">'
        f'<div class="card-media"><img src="{media(reel[0]["cover"])}" alt="" class="is-on"></div></div></article>'
    )
    cards = reel_card + "\n" + "\n".join(card(p, i, total) for i, p in enumerate(PROJECTS, 1))
    titles = ['<p class="big-title is-on" data-index="0" aria-hidden="true">BS.HAUS</p>'] + [
        f'<p class="big-title" data-index="{i}" aria-hidden="true">{e(p["short_title"])}</p>'
        for i, p in enumerate(PROJECTS, 1)
    ]
    metas = [
        f"""<div class="meta is-on" data-index="0">
  <span>BS.Haus</span><span>Creative studio</span><span>London, UK</span><span>Showreel ’{str(date.today().year)[2:]}</span>
</div>"""
    ] + [
        f"""<div class="meta" data-index="{i}">
  <span>{i:02d} / {total:02d}</span><span>{e(p['client'])}</span><span>{e(p['services'])}</span>
  <a href="/work/{p['slug']}" data-cursor="View">View project <span class="arrow">→</span></a>
</div>"""
        for i, p in enumerate(PROJECTS, 1)
    ]
    index = "".join(
        f'<li><button type="button" data-goto="{i}" aria-label="{e(p["title"])}"><span>{i:02d}</span><b>{e(p["short_title"])}</b></button></li>'
        for i, p in enumerate(PROJECTS, 1)
    )
    loader_frames = "".join(
        f'<img src="{media(p["cover"])}" alt="" decoding="async">' for p in PROJECTS
    )
    by_slug = {p["slug"]: p for p in PROJECTS}
    help_rows = "".join(
        f"""<li><a class="help-row" href="/work/{h['slug']}" data-preview="{media(by_slug[h['slug']]['cover'])}">
  <span class="help-name">{e(h['name'])}</span>
  <span class="help-line">{e(h['line'])}</span>
  <span class="help-tags">{e(' · '.join(by_slug[h['slug']]['tags']))}</span>
  <span class="arrow" aria-hidden="true">→</span>
</a></li>"""
        for h in SITE["help"]
    )
    logos = "".join(
        f'<img src="/media/clients/{c["logo"]}" alt="{e(c["name"])}" loading="lazy">' for c in SITE["clients"]
    )
    services = "".join(
        f"""<li class="svc">
  <span class="svc-num">0{i}</span>
  <h3 class="svc-title">{e(s['title'])}</h3>
  <p class="svc-desc">{e(s['description'])}</p>
  <p class="svc-caps">{e(' / '.join(s['capabilities']))}</p>
</li>"""
        for i, s in enumerate(SITE["services"], 1)
    )
    a = SITE["address"]
    wordmark = "".join(f'<span aria-hidden="true">{c}</span>' for c in "BS.HAUS")
    desc = SITE["description"]

    return f"""<!doctype html>
<html lang="en-GB" class="v2">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>BS.Haus — Lab: The Reel</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="{URL}/">
<meta name="theme-color" content="#0a0a0a">
<meta property="og:title" content="BS.Haus — Creative Studio, London">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{URL}{SITE['og_image']}">
{seo.icons()}
{seo.analytics(SITE)}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Inter:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="/v2/v2.css?v={version}">
<script>
  // Enhanced mode is opted into before first paint so the loader covers the page.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("v2-js");
</script>
</head>
<body>

<div class="loader" aria-hidden="true">
  <div class="loader-row"><span>BS.Haus</span><span>Creative studio</span></div>
  <div class="loader-window">{loader_frames}</div>
  <div class="loader-row"><span>London, UK</span><span class="loader-count">000</span></div>
</div>

<div class="cursor" aria-hidden="true"><span class="cursor-label"></span></div>
<div class="preview" aria-hidden="true"><img alt=""></div>

<nav class="dock" aria-label="Primary">
  <a class="dock-mark" href="#top" aria-label="BS.Haus — back to top"><em class="serif">BS</em></a>
  <a href="#work" data-nav="work">Work</a>
  <a href="#studio" data-nav="studio">Studio</a>
  <a href="#services" data-nav="services">Services</a>
  <a href="#contact" data-nav="contact">Contact</a>
  <span class="dock-time" aria-label="Time in London"><i></i><span data-clock>London</span></span>
</nav>

<main id="top">

<section class="stage" id="work" aria-label="Showreel and selected work">
  <div class="stage-pin" data-cursor="Drag">
    <div class="reel" data-cursor="Scroll">{reel_videos}</div>
    <div class="cards">
{cards}
    </div>
    <div class="big-titles">{''.join(titles)}</div>
    <div class="metas">{''.join(metas)}</div>
    <h1 class="hero-line"><span>We design <em class="serif">brand worlds</em></span><span>from zero to one.</span></h1>
    <ol class="stage-index" aria-label="Projects">{index}</ol>
    <div class="stage-progress" aria-hidden="true"><i></i></div>
    <p class="scroll-hint" aria-hidden="true">Scroll</p>
  </div>
</section>

<section class="studio" id="studio" aria-labelledby="studio-h">
  <p class="label" id="studio-h">(Studio)</p>
  <p class="statement">{statement(SITE['v2_statement'])}</p>
  <div class="studio-foot">
    <p>{e(SITE['intro'].replace('𝕭𝕾', 'BS'))}</p>
    <a class="pill-btn" href="{SITE['booking']}" target="_blank" rel="noopener" data-cursor="Book">Book a call <span class="arrow">→</span></a>
  </div>
</section>

<section class="help" aria-labelledby="help-h">
  <div class="sec-head"><p class="label">(Collaborations)</p><h2 id="help-h">How we’ve <em class="serif">helped</em></h2></div>
  <ul class="help-list">{help_rows}</ul>
  <div class="logos" aria-label="Brands we have collaborated with">{logos}</div>
</section>

<section class="services" id="services" aria-labelledby="svc-h">
  <div class="sec-head"><p class="label">(Services)</p><h2 id="svc-h">What we <em class="serif">do</em></h2></div>
  <ol class="svc-list">{services}</ol>
</section>

<footer class="foot" id="contact">
  <div class="foot-top">
    <p class="label">(Contact)</p>
    <p class="foot-ask">Have something <em class="serif">in mind?</em></p>
    <button class="foot-email" type="button" data-copy="{SITE['email']}" data-cursor="Copy">
      <span class="serif">{e(SITE['email'])}</span><span class="foot-copied" aria-live="polite"></span>
    </button>
    <noscript><p><a href="mailto:{SITE['email']}">{e(SITE['email'])}</a></p></noscript>
  </div>
  <div class="foot-cols">
    <div><p class="label">Studio</p><p>{e(a['street'])}<br>{e(a['locality'])}, {e(a['city'])} {e(a['postcode'])}</p></div>
    <div><p class="label">Elsewhere</p><p><a href="{SITE['instagram']}" target="_blank" rel="noopener">Instagram</a><br><a href="{SITE['booking']}" target="_blank" rel="noopener">Book a call</a></p></div>
    <div><p class="label">Explore</p><p><a href="/work">All work</a><br><a href="/">Home</a></p></div>
    <div><p class="label">London</p><p><span data-clock>—</span><br>© {date.today().year} BS.Haus</p></div>
  </div>
  <p class="wordmark" aria-label="BS.Haus">{wordmark}</p>
</footer>

</main>

<script src="{GSAP}/gsap.min.js" defer></script>
<script src="{GSAP}/ScrollTrigger.min.js" defer></script>
<script src="{THREE}" defer></script>
<script src="{LENIS}" defer></script>
<script src="/v2/v2.js?v={version}" defer></script>
</body>
</html>
"""
