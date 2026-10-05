#!/usr/bin/env python3
"""Static site generator for bs.haus.

Reads content/site.json + content/projects.json and writes plain HTML into
public/. No dependencies beyond the Python 3 standard library.

    python3 build.py          # build
    python3 build.py --serve  # build, then serve on http://localhost:8000

The generated public/ folder is committed, so Vercel deploys it as-is
(see vercel.json) without running a build step.
"""

import html
import json
import shutil
import sys
from datetime import date
from pathlib import Path

from build_v2 import page_v2

ROOT = Path(__file__).parent
OUT = ROOT / "public"
CONTENT = ROOT / "content"

SITE = json.loads((CONTENT / "site.json").read_text())
PROJECTS = json.loads((CONTENT / "projects.json").read_text())
URL = SITE["url"].rstrip("/")
BUILD_VERSION = date.today().strftime("%Y%m%d")

e = html.escape


def accent(text):
    """Set the BS monogram in the serif accent face wherever it appears in copy."""
    return text.replace("𝕭𝕾", '<em class="serif">BS</em>')


def media_url(path):
    return f"/media/{path}"


# ---------------------------------------------------------------- partials

CURRENT = ' aria-current="page"'
EXTERNAL = ' target="_blank" rel="noopener"'
NAV = [("Work", "/work"), ("Services", "/services"), ("Studio", "/studio"), ("Contact", "/contact")]


def head(title, description, path, image=None, schema=None):
    canonical = URL + path
    og_image = URL + (image or SITE["og_image"])
    full_title = title if title.startswith(SITE["name"]) else f"{title} — {SITE['name']}"
    schemas = [org_schema()] + ([schema] if schema else [])
    ld = "\n".join(
        f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>' for s in schemas
    )
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#000000">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(SITE['name'])}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,900&family=Inter:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="/assets/site.css?v={BUILD_VERSION}">
{ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
"""


def nav(active):
    links = "".join(
        f'<a href="{href}"{CURRENT if active == href else ""}>{label}</a>' for label, href in NAV
    )
    sheet = "".join(f'<a class="display" href="{href}">{label}</a>' for label, href in NAV)
    return f"""<header class="nav">
  <a class="nav-logo" href="/" aria-label="{e(SITE['name'])} home">BS.HAUS</a>
  <nav class="nav-pill" aria-label="Primary"><a href="/"{' aria-current="page"' if active == "/" else ""}>Home</a>{links}</nav>
  <a class="nav-cta" href="{SITE['booking']}" target="_blank" rel="noopener">Book a call</a>
  <button class="nav-toggle" aria-expanded="false" aria-controls="nav-sheet"><span>Menu</span></button>
</header>
<div class="nav-sheet" id="nav-sheet">
  <nav aria-label="Mobile">{sheet}</nav>
  <a class="btn btn-solid" href="{SITE['booking']}" target="_blank" rel="noopener">Book a call <span class="arrow">→</span></a>
</div>
"""


def meta_row(right=None):
    year = date.today().year
    return f"""<div class="meta-row">
  <span>BS.HAUS</span>
  <em class="serif" aria-hidden="true">BS</em>
  <span>A Creative<br>Venture Studio</span>
  <span>{e(SITE['city'])}<br>Est. {SITE['founded']}</span>
  <span>{right or f'©{year}'}</span>
</div>"""


def footer():
    work_links = "".join(f'<li><a class="link-u" href="/work/{p["slug"]}">{e(p["title"])}</a></li>' for p in PROJECTS[:6])
    a = SITE["address"]
    return f"""<footer class="footer wrap">
  <a class="footer-cta" href="/contact">
    <span class="eyebrow">Have a project in mind?</span>
    <span class="display">Let’s build<br>the next <em class="serif">thing</em></span>
  </a>
  <div class="footer-cols">
    <div>
      <h2>Studio</h2>
      <address>{e(SITE['name'])}<br>{e(a['street'])}<br>{e(a['locality'])}, {e(a['city'])} {e(a['postcode'])}</address>
    </div>
    <div><h2>Selected work</h2><ul>{work_links}</ul></div>
    <div><h2>Navigate</h2><ul>{''.join(f'<li><a class="link-u" href="{h}">{l}</a></li>' for l, h in NAV)}</ul></div>
    <div><h2>Elsewhere</h2><ul>
      <li><a class="link-u" href="mailto:{SITE['email']}">{e(SITE['email'])}</a></li>
      <li><a class="link-u" href="{SITE['instagram']}" target="_blank" rel="noopener">Instagram</a></li>
      <li><a class="link-u" href="{SITE['booking']}" target="_blank" rel="noopener">Book a call</a></li>
    </ul></div>
  </div>
  <div class="footer-base">
    <span>© {date.today().year} {e(SITE['legal_name'])} · Company no. {SITE['company_number']} · Registered in England &amp; Wales</span>
    <span>London, UK</span>
  </div>
</footer>
<script src="/assets/site.js?v={BUILD_VERSION}" defer></script>
</body>
</html>
"""


def org_schema():
    a = SITE["address"]
    return {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": URL + "/#organization",
        "name": SITE["name"],
        "legalName": SITE["legal_name"],
        "url": URL,
        "logo": URL + "/assets/favicon.svg",
        "image": URL + SITE["og_image"],
        "description": SITE["description"],
        "email": SITE["email"],
        "foundingDate": str(SITE["founded"]),
        "founders": [{"@type": "Person", "name": p["name"]} for p in SITE["founders"]],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": a["street"],
            "addressLocality": a["city"],
            "postalCode": a["postcode"],
            "addressCountry": "GB",
        },
        "areaServed": "Worldwide",
        "knowsAbout": [s["title"] for s in SITE["services"]] + SITE["keywords"],
        "sameAs": [SITE["instagram"]],
    }


# ---------------------------------------------------------------- components


def work_card(p, extra_class="", heading="h3", summary=True):
    tags = " · ".join(p["tags"][:2])
    cover = p["cover"]
    video = f' data-video="{media_url(p["video"])}"' if p.get("video") else ""
    small = f"<small>{e(p['summary'])}</small>" if summary else ""
    return f"""<a class="work-card reveal {extra_class}" href="/work/{p['slug']}"{video}>
  <div class="media" style="view-transition-name:media-{p['slug']}"><img src="{media_url(cover)}" alt="{e(p['cover_alt'])}" loading="lazy" decoding="async" width="1920" height="1080"></div>
  <div class="pill" aria-hidden="true"><span>{e(p['title'])}</span><span class="tags">{e(tags)}</span><span class="view">View</span></div>
  <{heading} class="display title">{small}<span style="view-transition-name:title-{p['slug']}">{e(p['short_title'])}</span></{heading}>
</a>"""


def services_grid():
    items = []
    for i, s in enumerate(SITE["services"], 1):
        lis = "".join(f"<li>{e(c)}</li>" for c in s["capabilities"])
        items.append(
            f"""<article class="service reveal">
  <span class="num">0{i}</span>
  <h3 class="display">{e(s['title'])}</h3>
  <p>{e(s['description'])}</p>
  <ul>{lis}</ul>
</article>"""
        )
    return f'<div class="services">{"".join(items)}</div>'


def process_grid():
    steps = []
    for i, s in enumerate(SITE["process"], 1):
        steps.append(
            f"""<article class="step reveal">
  <div class="phase"><span>{e(s['phase'])}</span><span>0{i}</span></div>
  <h3 class="display">{e(s['title'])}</h3>
  <p>{e(s['text'])}</p>
</article>"""
        )
    return f'<div class="process">{"".join(steps)}</div>'


def clients_grid():
    cells = "".join(
        f'<div class="client"><img src="/media/clients/{c["logo"]}" alt="{e(c["name"])}" loading="lazy"></div>'
        for c in SITE["clients"]
    )
    return f'<div class="clients reveal">{cells}</div>'


def archive_grid():
    return "".join(
        f'<figure class="reveal"><img src="{media_url(a["src"])}" alt="{e(a["title"])} — {e(a["type"])}" loading="lazy" decoding="async">'
        f'<figcaption><span>{e(a["title"])}</span><span>{e(a["type"])}</span></figcaption></figure>'
        for a in SITE["archive"]
    )


def marquee():
    words = SITE["marquee"]
    spans = "".join(
        f'<span class="{"serif" if i % 2 else "display"}">{e(w)}</span>' for i, w in enumerate(words * 2)
    )
    return f'<div class="marquee" aria-hidden="true"><div class="marquee-track">{spans}</div></div>'


# ---------------------------------------------------------------- pages


def page_home():
    reel = [p for p in PROJECTS if p.get("video")]
    videos = "\n".join(
        f'<video muted playsinline preload="{"auto" if i == 0 else "none"}" poster="{media_url(p["cover"])}" '
        f'data-caption="{e(p["title"])} — {e(p["summary"])}" aria-hidden="true"><source src="{media_url(p["video"])}" type="video/mp4"></video>'
        for i, p in enumerate(reel)
    )
    index = "".join(
        f'<button type="button" aria-label="Play {e(p["title"])}"><span>{e(p["title"])}</span><span class="bar"><i></i></span></button>'
        for p in reel
    )
    featured = [p for p in PROJECTS if p.get("featured")]
    cards = "\n".join(work_card(p) for p in featured)
    out = head(
        f"{SITE['name']} — {SITE['tagline']}",
        SITE["description"],
        "/",
        schema={
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": SITE["name"],
            "url": URL,
            "publisher": {"@id": URL + "/#organization"},
        },
    )
    out += nav("/")
    out += f"""<main id="main">
<section class="hero" data-reel aria-label="Showreel">
  <div class="hero-media">{videos}</div>
  <div class="hero-top">{meta_row()}</div>
  <div class="hero-bottom">
    <div class="hero-caption">
      <h1>{e(SITE['name'])} is a London creative venture studio designing brands, digital products and experiences from 0→1.</h1>
      <div class="reel-index">{index}</div>
    </div>
    <p class="display wordmark" aria-hidden="true">BS.HAUS</p>
  </div>
</section>

<section class="section wrap intro">
  <p class="lede reveal">{accent(SITE['intro'])}</p>
  <div class="intro-foot reveal">
    <p>{accent(SITE['intro_2'])}</p>
    <a class="btn" href="/studio">About the studio <span class="arrow">→</span></a>
  </div>
</section>

{marquee()}

<section class="section wrap" aria-labelledby="work-h">
  <div class="section-head reveal"><h2 id="work-h" class="display">Selected<br>work</h2><span class="count">({len(featured):02d})</span></div>
  <div class="work-stack">
{cards}
  </div>
  <p style="margin-top:32px;text-align:center"><a class="btn btn-solid" href="/work">View all projects <span class="arrow">→</span></a></p>
</section>

<section class="section wrap" aria-labelledby="services-h">
  <div class="section-head reveal"><h2 id="services-h" class="display">What<br>we do</h2><span class="count">(04)</span></div>
  <p class="lede reveal" style="margin-bottom:clamp(40px,5vw,72px)">{e(SITE['services_intro'])}</p>
  {services_grid()}
  <p style="margin-top:32px"><a class="btn" href="/services">Our services <span class="arrow">→</span></a></p>
</section>

<section class="section-tight wrap" aria-labelledby="clients-h">
  <div class="section-head reveal"><h2 id="clients-h" class="eyebrow">We have collaborated with brands such as</h2></div>
  {clients_grid()}
</section>

</main>
"""
    out += footer()
    return out


def page_work():
    cards = []
    for i, p in enumerate(PROJECTS):
        cards.append(work_card(p, "wide" if i % 3 == 0 else "", heading="h2", summary=i % 3 == 0))
    out = head(
        "Work",
        f"Selected projects by {SITE['name']}: brand identity, product design, web, campaigns and experiences for "
        + ", ".join(p["client"] for p in PROJECTS[:6])
        + " and more.",
        "/work",
        schema={
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": f"Work — {SITE['name']}",
            "url": URL + "/work",
            "hasPart": [{"@type": "CreativeWork", "name": p["title"], "url": f"{URL}/work/{p['slug']}"} for p in PROJECTS],
        },
    )
    out += nav("/work")
    out += f"""<main id="main">
<section class="page-head wrap">
  <h1 class="display">Our work</h1>
  <p class="lede">Brand worlds, digital products and experiences — built with founders, start-ups and global brands across fashion, art, technology and culture.</p>
</section>
<section class="wrap" style="padding-bottom:clamp(40px,6vw,80px)">
  <div class="work-grid">
{chr(10).join(cards)}
  </div>
</section>
<section class="section wrap" aria-labelledby="archive-h">
  <div class="section-head reveal"><h2 id="archive-h" class="display">Archive</h2><span class="count">({len(SITE['archive']):02d})</span></div>
  <div class="archive">{archive_grid()}</div>
</section>
</main>
"""
    out += footer()
    return out


def page_project(p, nxt):
    facts = [("Client", p["client"]), ("Industry", p["industry"]), ("Services", p["services"])]
    if p.get("year"):
        facts.append(("Year", p["year"]))
    if p.get("partner"):
        facts.append(("In partnership with", p["partner"]))
    facts_html = "".join(f'<div class="fact"><dt>{k}</dt><dd>{e(v)}</dd></div>' for k, v in facts)

    gallery = []
    if p.get("video"):
        gallery.append(
            f'<figure class="full reveal"><video data-autoplay muted loop playsinline preload="metadata" poster="{media_url(p["cover"])}" '
            f'aria-label="{e(p["title"])} project film"><source src="{media_url(p["video"])}" type="video/mp4"></video></figure>'
        )
    for i, img in enumerate(p.get("gallery", [])):
        cls = "full" if img.get("full") else ""
        gallery.append(
            f'<figure class="{cls} reveal"><img src="{media_url(img["src"])}" alt="{e(img.get("alt") or p["title"] + " — image " + str(i + 1))}" '
            f'loading="lazy" decoding="async"></figure>'
        )

    body = "".join(f"<p>{e(x)}</p>" for x in p["intro"])
    outcomes = "".join(f"<p>{e(x)}</p>" for x in p["outcomes"])
    description = p["summary"] + " " + p["intro"][0]
    if len(description) > 158:
        description = description[:155].rsplit(" ", 1)[0] + "…"

    out = head(
        f"{p['title']} — {p['services'].split(',')[0]}",
        description,
        f"/work/{p['slug']}",
        image=media_url(p["cover"]),
        schema={
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": p["title"],
            "url": f"{URL}/work/{p['slug']}",
            "image": URL + media_url(p["cover"]),
            "description": p["summary"],
            "creator": {"@id": URL + "/#organization"},
            "about": p["industry"],
            "keywords": ", ".join(p["tags"]),
        },
    )
    out += nav("/work")
    out += f"""<main id="main">
<article>
<header class="case-hero">
  <div class="case-media" style="view-transition-name:media-{p['slug']}">
    <img src="{media_url(p['cover'])}" alt="{e(p['cover_alt'])}" decoding="async" fetchpriority="high" width="1920" height="1080">
  </div>
  <a class="eyebrow link-u case-back" href="/work">← All work</a>
  <div class="case-head wrap">
    <h1 class="display case-title"><span class="client-of">{e(p['summary'])}</span><span style="view-transition-name:title-{p['slug']}">{e(p['short_title'])}</span></h1>
  </div>
</header>

<section class="section wrap">
  <div class="split reveal"><dl class="facts">{facts_html}</dl><div class="prose">{body}</div></div>
  <div class="split reveal"><h2 class="display">What we did</h2><div class="prose">{outcomes}</div></div>
</section>

<section class="wrap" aria-label="Project gallery">
  <div class="gallery">{''.join(gallery)}</div>
</section>

<nav class="section wrap" aria-label="Next project">
  <a class="next-project" href="/work/{nxt['slug']}">
    <span class="eyebrow">Next project</span>
    <span class="display" style="display:block;margin-top:12px">{e(nxt['short_title'])} <span class="arrow">→</span></span>
  </a>
</nav>
</article>
</main>
"""
    out += footer()
    return out


def page_services():
    blocks = []
    for i, s in enumerate(SITE["services"], 1):
        caps = "".join(f"<li>{e(c)}</li>" for c in s["capabilities"])
        blocks.append(
            f"""<div class="split reveal" id="{s['title'].lower()}">
  <div><span class="eyebrow">0{i}</span><h2 class="display" style="margin-top:10px">{e(s['title'])}</h2></div>
  <div>
    <p class="lede" style="max-width:30ch">{e(s['description'])}</p>
    <div class="prose" style="margin-top:24px">{''.join(f'<p>{e(x)}</p>' for x in s['detail'])}</div>
    <div class="service" style="padding:0;margin-top:24px"><ul style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">{caps}</ul></div>
  </div>
</div>"""
        )
    out = head(
        "Services — Brand, Product, Web & Experience Design",
        "Strategy, design, experience and technology services from a London creative studio: brand platforms, visual identity, web design & development, campaigns, motion, 3D, AI and mixed reality.",
        "/services",
        schema={
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": f"Services — {SITE['name']}",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i,
                    "item": {"@type": "Service", "name": s["title"], "description": s["description"], "provider": {"@id": URL + "/#organization"}},
                }
                for i, s in enumerate(SITE["services"], 1)
            ],
        },
    )
    out += nav("/services")
    out += f"""<main id="main">
<section class="page-head wrap">
  <h1 class="display">What we do</h1>
  <p class="lede">{e(SITE['services_intro'])}</p>
</section>
{marquee()}
<section class="section wrap">
{''.join(blocks)}
</section>
<section class="section wrap" aria-labelledby="process-h">
  <div class="section-head reveal"><h2 id="process-h" class="display">How we<br>work</h2><span class="count">Start → End</span></div>
  {process_grid()}
</section>
</main>
"""
    out += footer()
    return out


def page_studio():
    people = "".join(
        f'<div class="person reveal"><h3 class="display">{e(p["name"])}</h3><p>{e(p["role"])}</p></div>' for p in SITE["founders"]
    )
    out = head(
        "Studio — About Us",
        f"{SITE['name']} is a creative venture studio in London run by Ben Laing and Sarah Stoutamire, partnering with founders and leaders across fashion, art, technology and culture.",
        "/studio",
    )
    out += nav("/studio")
    out += f"""<main id="main">
<section class="page-head wrap">
  <h1 class="display">The <em class="serif">BS</em> Haus</h1>
  <p class="lede">{accent(SITE['intro'])}</p>
</section>
<section class="wrap reveal">
  <div class="gallery"><figure class="full"><img src="/media/studio/hero.jpg" alt="Chrome 3D BS lettering — the BS.Haus brand mark" loading="lazy"></figure></div>
</section>
<section class="section wrap">
  <div class="split reveal">
    <h2 class="display">Who we are</h2>
    <div class="prose">{''.join(f'<p>{accent(e(x))}</p>' for x in SITE['about'])}</div>
  </div>
  <div class="split reveal">
    <h2 class="display">Founders</h2>
    <div>
      <img class="founders-photo" src="/media/studio/founders.jpg" alt="Sarah Stoutamire and Ben Laing, founders of BS.Haus" loading="lazy" width="1090" height="1020">
      <div class="people" style="margin-top:20px">{people}</div>
    </div>
  </div>
  <div class="split reveal">
    <h2 class="display">Exploring</h2>
    <div class="prose"><p>{e(SITE['exploring'])}</p></div>
  </div>
</section>
<section class="wrap reveal">
  <div class="gallery"><figure class="full"><img src="/media/studio/monogram.jpg" alt="A silver BS monogram pendant" loading="lazy"></figure></div>
</section>
<section class="section-tight wrap" aria-labelledby="clients-h">
  <div class="section-head reveal"><h2 id="clients-h" class="eyebrow">Brands we have collaborated with</h2></div>
  {clients_grid()}
</section>
<section class="section wrap" aria-labelledby="process-h">
  <div class="section-head reveal"><h2 id="process-h" class="display">Design is<br>in our <em class="serif">DNA</em></h2><span class="count">Process</span></div>
  {process_grid()}
</section>
</main>
"""
    out += footer()
    return out


def page_contact():
    a = SITE["address"]
    rows = [
        ("New projects", SITE["email"], f"mailto:{SITE['email']}", "↗"),
        ("Book a call", "Grab a slot in our calendar", SITE["booking"], "↗"),
        ("Instagram", "@bs.haus", SITE["instagram"], "↗"),
    ]
    links = "".join(
        f'<a class="contact-row" href="{h}"{EXTERNAL if h.startswith("http") else ""}>'
        f'<span class="k">{k}</span><span class="v">{e(v)}</span><span class="arrow">{ar}</span></a>'
        for k, v, h, ar in rows
    )
    links += (
        f'<div class="contact-row"><span class="k">Studio</span><span class="v">{e(a["street"])}, {e(a["locality"])}, '
        f'{e(a["city"])} {e(a["postcode"])}</span><span></span></div>'
    )
    out = head(
        "Contact — Start a Project",
        f"Start a project with {SITE['name']}. Email {SITE['email']} or book a call with our London studio.",
        "/contact",
    )
    out += nav("/contact")
    out += f"""<main id="main">
<section class="page-head wrap">
  <h1 class="display">Say hello</h1>
  <p class="lede">We partner with founders and leaders building what’s next. Tell us about your idea — we usually reply within two working days.</p>
</section>
<section class="wrap" style="padding-bottom:clamp(40px,6vw,80px)">
  <div class="contact-list">{links}</div>
</section>
</main>
"""
    out += footer()
    return out


def page_404():
    out = head("Page not found", "This page doesn’t exist.", "/404")
    out = out.replace("<head>", '<head>\n<meta name="robots" content="noindex">', 1)
    out += nav("")
    out += """<main id="main">
<section class="page-head wrap" style="min-height:70svh">
  <h1 class="display">Lost in the <em class="serif">haus</em></h1>
  <p class="lede">That page doesn’t exist — but plenty of good work does.</p>
  <p style="margin-top:32px"><a class="btn btn-solid" href="/work">See our work <span class="arrow">→</span></a></p>
</section>
</main>
"""
    out += footer()
    return out


# ---------------------------------------------------------------- write


def write(path, text):
    target = OUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)


def build():
    # Clean previously generated HTML (media/assets are left alone).
    for f in OUT.rglob("*.html"):
        f.unlink()
    work_dir = OUT / "work"
    if work_dir.exists():
        shutil.rmtree(work_dir)

    pages = {
        "index.html": page_home(),
        "work/index.html": page_work(),
        "services.html": page_services(),
        "studio.html": page_studio(),
        "contact.html": page_contact(),
        "404.html": page_404(),
    }
    pages["v2/index.html"] = page_v2(SITE, PROJECTS, URL, BUILD_VERSION)
    for i, p in enumerate(PROJECTS):
        pages[f"work/{p['slug']}.html"] = page_project(p, PROJECTS[(i + 1) % len(PROJECTS)])
    for path, text in pages.items():
        write(path, text)

    paths = ["/", "/work", "/services", "/studio", "/contact"] + [f"/work/{p['slug']}" for p in PROJECTS]
    today = date.today().isoformat()
    urls = "".join(f"<url><loc>{URL}{p}</loc><lastmod>{today}</lastmod></url>" for p in paths)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {URL}/sitemap.xml\n")
    print(f"Built {len(pages)} pages → {OUT.relative_to(ROOT)}/")


def serve(port=8000):
    """Local preview that mimics Vercel's cleanUrls (/work/lisa → work/lisa.html)."""
    import http.server
    import functools

    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            path = self.path.split("?")[0].rstrip("/") or "/"
            candidate = OUT / path.lstrip("/")
            if path != "/" and not candidate.exists() and (OUT / (path.lstrip("/") + ".html")).exists():
                self.path = path + ".html"
            elif path != "/" and not candidate.exists():
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write((OUT / "404.html").read_bytes())
                return
            return super().do_GET()

    handler = functools.partial(Handler, directory=str(OUT))
    print(f"Serving http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()


if __name__ == "__main__":
    build()
    if "--serve" in sys.argv:
        serve()
