"""Shared head snippets for every page type (classic pages, /lab, the Studio OS home)."""

import json


def analytics(SITE):
    """Google Analytics 4 — same property as the previous Framer site so history continues."""
    ga = SITE.get("ga4")
    if not ga:
        return ""
    return f"""<script async src="https://www.googletagmanager.com/gtag/js?id={ga}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{ga}');</script>"""


def icons():
    return """<link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">"""


def organization(SITE, URL):
    a = SITE["address"]
    return {
        "@context": "https://schema.org",
        "@type": ["Organization", "ProfessionalService"],
        "@id": URL + "/#organization",
        "name": SITE["name"],
        "alternateName": ["BS Haus", "BSHaus", "BS"],
        "url": URL + "/",
        "logo": {"@type": "ImageObject", "url": URL + "/assets/logo-512.png", "width": 512, "height": 512},
        "image": URL + SITE["og_image"],
        "description": SITE["description"],
        "slogan": SITE["tagline"],
        "email": SITE["email"],
        "foundingDate": str(SITE["founded"]),
        "founders": [{"@type": "Person", "name": p["name"], "jobTitle": p["role"]} for p in SITE["founders"]],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": a["street"],
            "addressLocality": a["city"],
            "addressRegion": "London",
            "postalCode": a["postcode"],
            "addressCountry": "GB",
        },
        "areaServed": "Worldwide",
        "knowsAbout": [s["title"] for s in SITE["services"]] + SITE["keywords"],
        "sameAs": SITE.get("same_as", [SITE["instagram"]]),
    }


def ld(*objs):
    return "\n".join(f'<script type="application/ld+json">{json.dumps(o, ensure_ascii=False)}</script>' for o in objs)
