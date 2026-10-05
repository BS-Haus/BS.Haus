// BS.Haus v3 — "Studio OS"
// Desktop = studio photo. A glass window holds the studio; the dock holds the work.
// Opening a project swaps the desktop, minimises the window and the case study
// scrolls in over the new desktop. Scroll back to the top and the window re-opens.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const DATA = JSON.parse($("#v3-data").textContent);
  const P = Object.fromEntries(DATA.projects.map((p) => [p.slug, p]));

  // ------------------------------------------------------------ menubar clock + date, copy email
  const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
  const tick = () => {
    const now = new Date();
    $$("[data-clock]").forEach((el) => (el.textContent = `London ${timeFmt.format(now)}`));
    $$("[data-date]").forEach((el) => (el.textContent = dateFmt.format(now)));
  };
  tick();
  setInterval(tick, 15000);

  $$("[data-copy]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const note = $(".copied", btn);
      try { await navigator.clipboard.writeText(btn.dataset.copy); note.textContent = "Copied to clipboard"; }
      catch { location.href = `mailto:${btn.dataset.copy}`; return; }
      clearTimeout(btn._t);
      btn._t = setTimeout(() => (note.textContent = "Click to copy"), 2000);
    })
  );

  const enhanced = !reduced && window.gsap && window.ScrollTrigger;
  if (!enhanced) { root.classList.remove("v3-js"); return; }

  // ------------------------------------------------------------ setup
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("v3-on");
  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  const lenis = window.Lenis ? new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 }) : null;
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const scrollTo = (y, opts = {}) => (lenis ? lenis.scrollTo(y, { duration: 1.4, ...opts }) : window.scrollTo({ top: y, behavior: "smooth" }));

  const win = $(".os-window");
  const titleEl = $(".win-title");
  const spacer = $(".spacer");
  const doc = $("#doc");
  const desktop = $(".desktop");
  const dim = $(".desktop-dim");
  const cue = $(".scroll-cue");
  const infoView = $(".view-info");
  const MENUBAR = 30;

  // ------------------------------------------------------------ views inside the window
  const VIEW_TITLES = { about: "About — BS.Haus", work: `Work — ${DATA.projects.length} items`, services: "Services — BS.Haus", contact: "Contact — BS.Haus" };
  let view = "about";
  const setView = (name, title) => {
    view = name;
    $$(".view").forEach((v) => v.classList.toggle("is-on", v.dataset.viewPanel === name));
    $$(".side-list button, .mb-menu button").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.view === name || (name === "info" && b.dataset.open === current))
    );
    titleEl.textContent = title || VIEW_TITLES[name] || "BS.Haus";
    const section = name === "info" ? "work" : name;
    $$(".dock-app").forEach((b) => b.classList.toggle("is-open", b.dataset.view === section));
  };

  $$("[data-layout]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-layout]").forEach((x) => x.classList.toggle("is-on", x === b));
      $(".files").classList.toggle("is-list", b.dataset.layout === "list");
    })
  );

  // ------------------------------------------------------------ the desktop (background layers)
  const layers = { studio: $('[data-bg="studio"]') };
  let bgKey = "studio";
  let bgCycle = 0;
  const makeLayer = (key) => {
    const el = document.createElement("div");
    el.className = "bg-layer";
    el.dataset.bg = key;
    if (key === "reel") {
      const v = document.createElement("video");
      Object.assign(v, { muted: true, playsInline: true, preload: "auto" });
      let i = 0;
      v.src = DATA.reel[0];
      v.addEventListener("ended", () => { i = (i + 1) % DATA.reel.length; v.src = DATA.reel[i]; v.play().catch(() => {}); });
      el.append(v);
    } else {
      const p = P[key];
      if (p.video) {
        const v = document.createElement("video");
        Object.assign(v, { muted: true, loop: true, playsInline: true, preload: "auto", poster: p.cover });
        v.src = p.video;
        el.append(v);
      } else {
        // a slow slideshow of the project's full-bleed frames
        const srcs = [p.cover, ...p.gallery.filter((g) => g.full).map((g) => g.src)].slice(0, 4);
        srcs.forEach((src, i) => {
          const img = new Image();
          img.src = src;
          img.alt = "";
          img.className = i ? "" : "is-on";
          img.style.transition = "opacity 1.6s ease";
          if (i) img.style.opacity = 0;
          el.append(img);
        });
      }
    }
    desktop.append(el);
    return el;
  };
  const setBg = (key) => {
    if (key === bgKey) return;
    const next = layers[key] || (layers[key] = makeLayer(key));
    const prev = layers[bgKey];
    bgKey = key;
    clearInterval(bgCycle);
    requestAnimationFrame(() => {
      next.classList.add("is-on");
      prev?.classList.remove("is-on");
      gsap.fromTo(next, { scale: 1.08 }, { scale: 1, duration: 2.6, ease: "expo.out" });
    });
    $$("video", desktop).forEach((v) => (v.closest(".bg-layer") === next ? v.play().catch(() => {}) : v.pause()));
    const imgs = $$("img", next);
    if (imgs.length > 1) {
      let i = 0;
      bgCycle = setInterval(() => {
        imgs[i].style.opacity = 0;
        i = (i + 1) % imgs.length;
        imgs[i].style.opacity = 1;
      }, 6500);
    }
  };

  if (fine) {
    const qx = gsap.quickTo(desktop, "x", { duration: 1.2, ease: "power3" });
    const qy = gsap.quickTo(desktop, "y", { duration: 1.2, ease: "power3" });
    addEventListener("pointermove", (e) => { qx((e.clientX / innerWidth - 0.5) * -22); qy((e.clientY / innerHeight - 0.5) * -14); });
  }

  // ------------------------------------------------------------ documents (scroll-in content)
  const docs = { studio: $('[data-doc="studio"]') };
  let docKey = "studio";
  const renderProject = (p) => {
    const list = DATA.projects;
    const next = list[(list.indexOf(p) + 1) % list.length];
    const facts = [["Client", p.client], ["Services", p.services], ["Industry", p.industry], [p.partner ? "With" : "Year", p.partner || p.year || "—"]];
    const media = [
      ...(p.video ? [`<figure class="full"><video src="${esc(p.video)}" muted loop playsinline autoplay preload="metadata" poster="${esc(p.cover)}"></video></figure>`] : []),
      ...p.gallery.map((g) => `<figure class="${g.full ? "full" : ""}"><img src="${esc(g.src)}" alt="${esc(p.title)}" loading="lazy" decoding="async"></figure>`),
    ].join("");
    const el = document.createElement("article");
    el.dataset.doc = p.slug;
    el.innerHTML = `
      <header class="doc-hero">
        <p class="doc-kicker">${esc(p.client)} — ${esc(p.industry)}</p>
        <h1 class="doc-title">${esc(p.short)}</h1>
        <p class="doc-kicker" style="margin-top:18px;max-width:44ch;font-size:16px">${esc(p.summary)}</p>
      </header>
      <section class="glass facts-row">${facts.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join("")}</section>
      <section class="glass doc-block">
        <div class="doc-cols">
          <p class="doc-lede">${esc(p.intro[0])}</p>
          <div class="doc-prose">${p.intro.slice(1).map((x) => `<p>${esc(x)}</p>`).join("")}${p.outcomes.map((x) => `<p>${esc(x)}</p>`).join("")}</div>
        </div>
      </section>
      <section class="doc-gallery">${media}</section>
      <section class="glass next-up" data-open="${esc(next.slug)}" role="button" tabindex="0">
        <div><span>Next project</span><b>${esc(next.short)}</b></div>
        <img src="${esc(next.cover)}" alt="" loading="lazy">
      </section>
      <section class="doc-end">
        <a class="pill-btn ghost" href="/work/${esc(p.slug)}">Open the full case study ↗</a>
      </section>`;
    return el;
  };
  const showDoc = (key) =>
    new Promise((resolve) => {
      if (key === docKey) return resolve();
      const prev = docs[docKey];
      const next = docs[key] || (docs[key] = renderProject(P[key]));
      docKey = key;
      prev.classList.add("is-out");
      setTimeout(() => {
        prev.remove();
        next.classList.add("is-out");
        doc.append(next);
        requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("is-out")));
        ScrollTrigger.refresh();
        resolve();
      }, 380);
    });

  // ------------------------------------------------------------ project "Get Info" view
  const renderInfo = (p) => {
    infoView.innerHTML = `
      <p class="v-label">${esc(p.client)}</p>
      <div class="info">
        <div class="info-media"><img src="${esc(p.cover)}" alt=""></div>
        <div>
          <h2>${esc(p.short)}</h2>
          <p class="info-sum">${esc(p.summary)}</p>
          <dl>
            <div><dt>Services</dt><dd>${esc(p.services)}</dd></div>
            <div><dt>Industry</dt><dd>${esc(p.industry)}</dd></div>
            ${p.partner ? `<div><dt>With</dt><dd>${esc(p.partner)}</dd></div>` : ""}
          </dl>
          <div class="info-actions">
            <button type="button" class="pill-btn" data-read>Read the case study ↓</button>
            <button type="button" class="pill-btn ghost" data-view="work">All work</button>
          </div>
        </div>
      </div>`;
  };

  // ------------------------------------------------------------ open / close
  let current = null;
  const docStart = () => spacer.offsetTop + spacer.offsetHeight;
  const openProject = async (slug, { scroll = true } = {}) => {
    const p = P[slug];
    if (!p) return;
    current = slug;
    setBg(slug);
    renderInfo(p);
    setView("info", `${p.title} — Info`);
    history.replaceState(null, "", `?p=${slug}`);
    const atTop = M < 0.5;
    await showDoc(slug);
    if (scroll) scrollTo(docStart(), { duration: atTop ? 1.8 : 0.01, immediate: !atTop });
  };
  const openStudio = ({ toTop = true } = {}) => {
    current = null;
    setBg("studio");
    showDoc("studio");
    setView("about");
    history.replaceState(null, "", location.pathname);
    if (toTop) scrollTo(0, { duration: 1.4 });
  };

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open], [data-view], [data-studio], [data-reel], [data-read], [data-light]");
    if (!t) return;
    if (t.matches("[data-open]")) { e.preventDefault(); openProject(t.dataset.open); }
    else if (t.matches("[data-studio]")) openStudio();
    else if (t.matches("[data-view]")) { setView(t.dataset.view); if (M > 0.3) scrollTo(0); }
    else if (t.matches("[data-reel]")) { setBg("reel"); }
    else if (t.matches("[data-read]")) scrollTo(docStart(), { duration: 1.8 });
    else if (t.matches("[data-light]")) {
      if (t.dataset.light === "max") toggleMax();
      else scrollTo(docStart(), { duration: 1.6 });
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openStudio();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".next-up")) { e.preventDefault(); openProject(e.target.dataset.open); }
  });
  win.addEventListener("click", () => { if (win.classList.contains("is-mini")) scrollTo(0, { duration: 1.4 }); });

  // ------------------------------------------------------------ window geometry: open ⇄ minimised (scroll-scrubbed)
  let M = 0; // 0 = open, 1 = minimised
  let ox = 0, oy = 0; // drag offset
  const slot = $(".dock-win");
  const dockEl = $(".dock");
  const place = () => {
    const vw = innerWidth, vh = innerHeight;
    const w = win.offsetWidth, h = win.offsetHeight;
    const cy = MENUBAR + (vh - MENUBAR - 96) / 2;
    const m = M < 0.5 ? 4 * M * M * M : 1 - Math.pow(-2 * M + 2, 3) / 2;
    // the dock opens a slot for the window, sized to the window's aspect
    const tileW = vw < 760 ? 52 : 64;
    slot.style.width = `${(tileW * clamp(M * 1.6, 0, 1)).toFixed(1)}px`;
    dockEl.classList.toggle("has-win", M > 0.05);
    const s = slot.getBoundingClientRect();
    const tx = s.left + s.width / 2 - vw / 2;
    const ty = s.top + s.height / 2 - cy;
    const genie = Math.sin(m * Math.PI);
    gsap.set(win, {
      top: cy,
      xPercent: -50,
      yPercent: -50,
      transformOrigin: "50% 50%",
      x: lerp(ox, tx, m),
      y: lerp(oy, ty, m),
      scale: lerp(1, tileW / w, m),
      skewX: genie * -5,
      rotationX: genie * 14,
      transformPerspective: 1200,
    });
    win.classList.toggle("is-mini", M > 0.6);
    win.classList.toggle("is-docked", M > 0.45);
    cue.style.opacity = clamp(1 - M * 5, 0, 1);
    dim.style.opacity = 0.12 + 0.38 * clamp((scrollY() - spacer.offsetHeight * 0.6) / (innerHeight * 0.6), 0, 1);
  };

  const toggleMax = () => {
    win.classList.toggle("is-max");
    ox = oy = 0;
    place();
  };
  $(".titlebar").addEventListener("dblclick", (e) => { if (!e.target.closest(".lights")) toggleMax(); });

  // drag the window by its title bar
  let drag = null;
  $(".titlebar").addEventListener("pointerdown", (e) => {
    if (M > 0.05 || e.target.closest(".lights") || e.button > 0) return;
    drag = { x: e.clientX - ox, y: e.clientY - oy };
    $(".titlebar").setPointerCapture(e.pointerId);
  });
  $(".titlebar").addEventListener("pointermove", (e) => {
    if (!drag) return;
    const maxX = innerWidth / 2 - 60, maxY = innerHeight / 2 - 80;
    ox = clamp(e.clientX - drag.x, -maxX, maxX);
    oy = clamp(e.clientY - drag.y, -innerHeight * 0.3, maxY);
    place();
  });
  $(".titlebar").addEventListener("pointerup", () => (drag = null));

  // ------------------------------------------------------------ dock magnification + tooltip
  const dockList = $(".dock ul");
  const apps = $$(".dock-app");
  const tip = $(".dock-tip");
  if (fine) {
    dockList.addEventListener("pointermove", (e) => {
      let best = null, bestD = Infinity;
      apps.forEach((a) => {
        const r = a.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        a.style.setProperty("--s", (1 + 0.6 * Math.max(0, 1 - d / 120)).toFixed(3));
        if (d < bestD) { bestD = d; best = a; }
      });
      if (best && bestD < 40) {
        const r = best.getBoundingClientRect();
        const dr = $(".dock").getBoundingClientRect();
        tip.textContent = best.dataset.label;
        tip.style.left = `${r.left + r.width / 2 - dr.left}px`;
        tip.classList.add("is-on");
      } else tip.classList.remove("is-on");
    });
    dockList.addEventListener("pointerleave", () => {
      apps.forEach((a) => a.style.setProperty("--s", 1));
      tip.classList.remove("is-on");
    });
  }

  // ------------------------------------------------------------ scroll wiring
  const buildScroll = () => {
    ScrollTrigger.create({
      trigger: spacer,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => { M = self.progress; },
      onRefresh: (self) => { M = self.progress; },
    });
    gsap.ticker.add(place);
    // glass panels drift up into place as they enter
    ScrollTrigger.batch(".doc .glass, .doc-gallery figure, .doc-hero", {
      start: "top 94%",
      onEnter: (els) => gsap.fromTo(els, { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 1.2, ease: "expo.out", overwrite: true }),
    });
    addEventListener("resize", () => ScrollTrigger.refresh());
  };

  // ------------------------------------------------------------ boot sequence
  const boot = $(".boot");
  const bar = $(".boot-bar i");
  let seen = false;
  try { seen = sessionStorage.getItem("bs-v3-seen") === "1"; sessionStorage.setItem("bs-v3-seen", "1"); } catch {}
  const studioVid = $("video", layers.studio);
  const imgReady = studioVid.readyState >= 3 ? Promise.resolve() : new Promise((r) => { studioVid.addEventListener("canplay", r, { once: true }); studioVid.addEventListener("error", r, { once: true }); });
  studioVid.play().catch(() => {});
  const ready = Promise.race([Promise.all([imgReady, document.fonts.ready]), new Promise((r) => setTimeout(r, 4000))]);
  const minBoot = new Promise((r) => gsap.to(bar, { width: "82%", duration: seen ? 0.35 : 1.3, ease: "power2.inOut", onComplete: r }));

  gsap.set(".menubar", { yPercent: -110 });
  gsap.set(".dock", { yPercent: 140 });
  gsap.set(win, { autoAlpha: 0 });
  place();

  Promise.all([ready, minBoot]).then(() => {
    const deep = new URLSearchParams(location.search).get("p");
    if (deep && P[deep]) { current = deep; setBg(deep); renderInfo(P[deep]); setView("info", `${P[deep].title} — Info`); showDoc(deep); }
    const tl = gsap.timeline({
      onComplete() {
        boot.remove();
        buildScroll();
        lenis?.start();
      },
    });
    tl.to(bar, { width: "100%", duration: 0.25, ease: "power1.out" })
      .to(boot, { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" })
      .fromTo(desktop, { scale: 1.12, filter: "blur(18px) brightness(0.6)" }, { scale: 1, filter: "blur(0px) brightness(1)", duration: 1.8, ease: "expo.out", clearProps: "filter" }, "<")
      .to(".menubar", { yPercent: 0, duration: 0.9, ease: "expo.out" }, "-=1.3")
      .to(".dock", { yPercent: 0, duration: 1.1, ease: "expo.out" }, "<0.1")
      .fromTo(win, { autoAlpha: 0, scale: 0.86, y: 40 }, {
        autoAlpha: 1, scale: 1, y: 0, duration: 1.1, ease: "expo.out",
        onUpdate() { /* keep base geometry while it launches */ },
        onComplete() { place(); },
      }, "<0.15")
      .from($$(".view.is-on > *"), { y: 14, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: "expo.out" }, "<0.25");
  });
})();
