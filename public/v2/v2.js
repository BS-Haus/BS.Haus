// BS.Haus v2 — "The Reel"
// Loader → full-bleed showreel → scroll shrinks the reel into a card → projects
// arrive one by one from depth → studio / collaborations / services → footer.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const loadVideo = (v) => { if (v && !v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); } };
  const play = (v) => { if (!v) return; loadVideo(v); v.play().catch(() => {}); };

  // ------------------------------------------------------------ always-on bits
  const clockFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const tickClock = () => {
    const t = clockFmt.format(new Date());
    $$("[data-clock]").forEach((el) => (el.textContent = el.closest(".dock") ? `London ${t}` : t));
  };
  tickClock();
  setInterval(tickClock, 15000);

  $$("[data-copy]").forEach((btn) => {
    const note = $(".foot-copied", btn);
    btn.addEventListener("click", async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        note.textContent = "Copied";
      } catch {
        location.href = `mailto:${value}`;
        return;
      }
      clearTimeout(btn._t);
      btn._t = setTimeout(() => (note.textContent = ""), 1800);
    });
  });

  const reelVideos = $$(".reel video");
  const enhanced = !reduced && window.gsap && window.ScrollTrigger;
  if (!enhanced) {
    root.classList.remove("v2-js");
    play(reelVideos[0]);
    reelVideos[0]?.setAttribute("loop", "");
    return;
  }

  // ------------------------------------------------------------ setup
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("v2-on");
  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const lenis = window.Lenis ? new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 }) : null;
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = (target, opts = {}) =>
    lenis
      ? lenis.scrollTo(target, { duration: 1.2, ...opts })
      : window.scrollTo({ top: typeof target === "number" ? target : target.offsetTop, behavior: "smooth" });

  const stage = $(".stage");
  const pin = $(".stage-pin");
  const reel = $(".reel");
  const cards = $$(".card");
  const titles = $$(".big-title");
  const metas = $$(".meta");
  const indexBtns = $$(".stage-index button");
  const heroLine = $(".hero-line");
  const progressBar = $(".stage-progress i");
  const N = cards.length;

  // Split the giant titles into masked characters.
  titles.forEach((t) => {
    t.innerHTML = [...t.textContent].map((c) => `<span class="ch"><i>${c === " " ? "&nbsp;" : c}</i></span>`).join("");
  });
  const chars = titles.map((t) => $$(".ch > i", t));
  heroLine.querySelectorAll(":scope > span").forEach((s) => (s.innerHTML = `<i>${s.innerHTML}</i>`));
  const heroBits = $$(":scope > span > i", heroLine);

  const gutter = () => parseFloat(getComputedStyle(root).getPropertyValue("--gutter")) || 24;
  const fitTitles = () => {
    const avail = pin.clientWidth - gutter() * 2;
    const max = innerWidth * 0.2;
    titles.forEach((t) => {
      t.style.fontSize = "100px";
      t.style.fontSize = `${Math.min(max, (100 * avail) / t.scrollWidth)}px`;
    });
    heroLine.style.bottom = `${74 + titles[0].offsetHeight * 1.04 + 16}px`;
  };

  const geom = () => {
    const vw = innerWidth, vh = innerHeight;
    const cw = vw <= 760 ? vw * 0.88 : Math.min(vw * 0.6, 1080);
    const ch = (cw * 10) / 16;
    const top = vh * 0.46 - ch / 2;
    return { vw, vh, cw, ch, top, left: (vw - cw) / 2 };
  };
  const inset = (t, r, b, l, rad) => `inset(${t}px ${r}px ${b}px ${l}px round ${rad}px)`;
  const cardInset = () => { const g = geom(); return inset(g.top, g.left, g.vh - g.top - g.ch, g.left, 12); };
  const fullInset = () => inset(0, 0, 0, 0, 0);

  // ------------------------------------------------------------ reel playback
  let reelIdx = 0;
  let reelPlaying = false;
  reelVideos.forEach((v, i) =>
    v.addEventListener("ended", () => {
      if (!reelPlaying) return;
      reelVideos[i].classList.remove("is-on");
      reelIdx = (i + 1) % reelVideos.length;
      const next = reelVideos[reelIdx];
      next.currentTime = 0;
      next.classList.add("is-on");
      play(next);
      loadVideo(reelVideos[(reelIdx + 1) % reelVideos.length]);
    })
  );
  const setReel = (on) => {
    if (on === reelPlaying) return;
    reelPlaying = on;
    const v = reelVideos[reelIdx];
    if (on) play(v); else v?.pause();
  };

  // ------------------------------------------------------------ per-card snippets
  let slideTimer = 0;
  const startCard = (card) => {
    clearInterval(slideTimer);
    const video = $("video", card);
    if (video) {
      loadVideo(video);
      video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
      play(video);
      return;
    }
    const imgs = $$(".card-media img", card);
    if (imgs.length < 2) return;
    let i = imgs.findIndex((im) => im.classList.contains("is-on"));
    slideTimer = setInterval(() => {
      imgs[i].classList.remove("is-on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("is-on");
    }, 1500);
  };
  const stopCard = (card) => { $("video", card)?.pause(); };

  let active = -1;
  const setActive = (k) => {
    if (k === active) return;
    if (active > 0) stopCard(cards[active - 1]);
    active = k;
    setReel(k === 0);
    cards.forEach((c, i) => (c.style.pointerEvents = i === k - 1 ? "auto" : "none"));
    if (k > 0) startCard(cards[k - 1]);
    else clearInterval(slideTimer);
    [k, k + 1].forEach((j) => j >= 1 && j <= N && loadVideo($("video", cards[j - 1])));
    indexBtns.forEach((b, i) => b.classList.toggle("is-active", i === k - 1));
  };

  // ------------------------------------------------------------ the stage timeline
  const MOVE = 1, HOLD = 0.7;
  const labelTimes = [0]; // 0 = full reel, 1 = reel as a card, 2.. = projects
  let stageST = null;
  let total = 0;

  const buildStage = () => {
    gsap.set(cards, { xPercent: -50, yPercent: -50, top: "46%" });
    gsap.set(reel, { transformOrigin: "50% 46%" });
    const tl = gsap.timeline({ defaults: { ease: "none" } });

    tl.fromTo(reel, { clipPath: fullInset }, { clipPath: cardInset, duration: MOVE, ease: "power2.inOut" }, 0);
    tl.to(heroLine, { autoAlpha: 0, y: -24, duration: 0.4 }, 0);
    tl.to(".scroll-hint", { autoAlpha: 0, duration: 0.2 }, 0);
    tl.to([".stage-index", ".stage-progress"], { autoAlpha: 1, duration: 0.3 }, MOVE * 0.7);
    let t = MOVE;
    labelTimes.push(t);

    for (let k = 1; k <= N; k++) {
      const start = t + HOLD;
      const prev = k === 1 ? reel : cards[k - 2];
      const next = cards[k - 1];
      tl.to(prev, { scale: 1.32, autoAlpha: 0, duration: MOVE, ease: "power2.in" }, start);
      tl.fromTo(next, { y: () => innerHeight * 0.55, scale: 0.5, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: MOVE, ease: "power3.out" }, start + 0.08);
      tl.to(chars[k - 1], { yPercent: -140, stagger: 0.025, duration: 0.45, ease: "power2.in" }, start);
      tl.fromTo(chars[k], { yPercent: 140 }, { yPercent: 0, stagger: 0.025, duration: 0.55, ease: "power3.out" }, start + 0.45);
      tl.to(metas[k - 1], { autoAlpha: 0, y: -8, duration: 0.3 }, start);
      tl.fromTo(metas[k], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 }, start + 0.6);
      t = start + MOVE;
      labelTimes.push(t);
    }
    tl.to({}, { duration: HOLD });
    total = tl.duration();

    stageST = ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: () => `+=${innerHeight * total * 0.7}`,
      pin,
      scrub: 0.5,
      animation: tl,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const time = self.progress * total;
        let k = 0;
        for (let i = 1; i < labelTimes.length; i++) if (time >= labelTimes[i] - MOVE * 0.45) k = i;
        setActive(Math.max(0, k - 1));
        progressBar.style.height = `${self.progress * 100}%`;
      },
    });
  };

  const labelScroll = (i) => stageST.start + (stageST.end - stageST.start) * (labelTimes[i] / total);

  // Directional snapping: once scrolling settles inside the stage, a small
  // nudge past a stop carries on to the next project (or back to the previous).
  let snapTimer = 0;
  let lastDir = 1;
  const snap = () => {
    if (!stageST || !lenis) return;
    const y = lenis.scroll;
    if (y < stageST.start - 2 || y > stageST.end - innerHeight * 0.2) return;
    const stops = labelTimes.map((_, i) => labelScroll(i));
    const i = stops.findIndex((s) => s > y + 1);
    if (i <= 0) return;
    const a = stops[i - 1], b = stops[i];
    const f = (y - a) / (b - a);
    const target = lastDir > 0 ? (f > 0.08 ? b : a) : (f < 0.92 ? a : b);
    if (Math.abs(target - y) > 2) lenis.scrollTo(target, { duration: 1.1, easing: (x) => 1 - Math.pow(1 - x, 4) });
  };
  lenis?.on("scroll", ({ velocity, direction }) => {
    if (direction) lastDir = direction;
    clearTimeout(snapTimer);
    if (Math.abs(velocity) < 40) snapTimer = setTimeout(snap, 140);
  });

  indexBtns.forEach((b) => b.addEventListener("click", () => scrollTo(labelScroll(+b.dataset.goto + 1))));

  // ------------------------------------------------------------ dock
  const navLinks = $$(".dock a[data-nav]");
  const setNav = (name) => navLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.nav === name));
  $$(".dock a[href^='#']").forEach((a) =>
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = a.getAttribute("href").slice(1);
      if (id === "top") scrollTo(0);
      else if (id === "work") scrollTo(labelScroll(2));
      else scrollTo($(`#${id}`), { offset: id === "contact" ? 0 : -40 });
    })
  );

  // ------------------------------------------------------------ cursor + previews
  if (fine) {
    const cursor = $(".cursor");
    const label = $(".cursor-label");
    const cx = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
    const preview = $(".preview");
    const pimg = $("img", preview);
    const px = gsap.quickTo(preview, "x", { duration: 0.8, ease: "power3" });
    const py = gsap.quickTo(preview, "y", { duration: 0.8, ease: "power3" });
    addEventListener("pointermove", (e) => { cx(e.clientX); cy(e.clientY); px(e.clientX); py(e.clientY); });
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor]");
      label.textContent = t ? t.dataset.cursor : "";
      cursor.classList.toggle("has-label", !!t && t.dataset.cursor !== "Scroll");
      const row = e.target.closest("[data-preview]");
      if (row) {
        if (pimg.getAttribute("src") !== row.dataset.preview) pimg.src = row.dataset.preview;
        gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power3.out" });
        cursor.classList.add("has-label");
        label.textContent = "View";
      }
    });
    $(".help-list").addEventListener("pointerleave", () =>
      gsap.to(preview, { autoAlpha: 0, scale: 0.7, duration: 0.4, ease: "power3.in" })
    );
  }

  // ------------------------------------------------------------ studio statement + reveals
  const splitWords = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else { const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.append(s); }
          });
          n.replaceWith(frag);
        } else if (n.classList?.contains("chip")) n.classList.add("w");
        else walk(n);
      });
    };
    walk(el);
    return $$(".w", el);
  };

  const buildSections = () => {
    const statement = $(".statement");
    gsap.to(splitWords(statement), {
      opacity: 1,
      stagger: 0.08,
      ease: "none",
      scrollTrigger: { trigger: statement, start: "top 82%", end: "bottom 50%", scrub: true },
    });
    $$(".chip").forEach((c) =>
      gsap.from(c, { width: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 85%" } })
    );

    $$(".sec-head, .studio-foot, .logos, .foot-ask, .foot-email, .foot-cols").forEach((el) =>
      gsap.from(el, { y: 48, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } })
    );
    ScrollTrigger.batch(".help-row, .svc", {
      start: "top 92%",
      once: true,
      onEnter: (els) => gsap.from(els, { y: 40, autoAlpha: 0, stagger: 0.07, duration: 1.1, ease: "expo.out" }),
    });

    const navSections = [["studio", "#studio"], ["studio", ".help"], ["services", "#services"], ["contact", "#contact"]];
    navSections.forEach(([name, sel]) =>
      ScrollTrigger.create({ trigger: sel, start: "top 55%", end: "bottom 55%", onToggle: (s) => s.isActive && setNav(name) })
    );
    ScrollTrigger.create({ trigger: stage, start: "top top", end: () => stageST.end, onToggle: (s) => s.isActive && setNav("work") });
  };

  // ------------------------------------------------------------ footer wordmark (variable width/weight follows the cursor)
  const letters = $$(".wordmark span");
  const state = letters.map(() => ({ w: 100, g: 800 }));
  let pointer = null;
  let footVisible = false;
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") pointer = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  new IntersectionObserver(([en]) => (footVisible = en.isIntersecting)).observe($(".wordmark"));
  gsap.ticker.add(() => {
    if (!footVisible) return;
    const now = performance.now();
    const live = pointer && now - pointer.t < 2500;
    letters.forEach((el, i) => {
      let t;
      if (live) {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(pointer.x - (r.left + r.width / 2), (pointer.y - (r.top + r.height / 2)) * 0.6);
        t = clamp(1 - d / (innerWidth * 0.28), 0, 1);
      } else {
        t = 0.5 + 0.5 * Math.sin(now / 700 + i * 0.75);
      }
      const s = state[i];
      s.w += (84 + 41 * t - s.w) * 0.12;
      s.g += (420 + 480 * t - s.g) * 0.12;
      el.style.fontVariationSettings = `"wdth" ${s.w.toFixed(1)}, "wght" ${s.g.toFixed(0)}`;
    });
  });

  // ------------------------------------------------------------ loader → intro
  const loader = $(".loader");
  const frames = $$(".loader-window img");
  const win = $(".loader-window");
  const count = $(".loader-count");
  let seen = false;
  try { seen = sessionStorage.getItem("bs-v2-seen") === "1"; sessionStorage.setItem("bs-v2-seen", "1"); } catch {}

  // Hide everything the intro reveals.
  gsap.set(chars.flat(), { yPercent: 140 });
  gsap.set(metas, { autoAlpha: 0 });
  gsap.set(cards, { autoAlpha: 0 });
  gsap.set([".stage-index", ".stage-progress", ".scroll-hint"], { autoAlpha: 0 });
  gsap.set(heroBits, { yPercent: 105 });
  gsap.set(".dock", { y: 90, autoAlpha: 0 });

  let f = 0;
  frames[0]?.classList.add("is-on");
  const flicker = setInterval(() => {
    frames[f].classList.remove("is-on");
    f = (f + 1) % frames.length;
    frames[f].classList.add("is-on");
  }, 120);

  const first = reelVideos[0];
  loadVideo(first);
  const videoReady = new Promise((res) => {
    if (first.readyState >= 3) res();
    first.addEventListener("canplay", res, { once: true });
  });
  const ready = Promise.race([Promise.all([document.fonts.ready, videoReady]), new Promise((r) => setTimeout(r, 5000))]);
  const counter = { v: 0 };
  const render = () => (count.textContent = String(Math.round(counter.v)).padStart(3, "0"));
  const minTime = seen ? 0.5 : 1.9;
  const counting = new Promise((res) => gsap.to(counter, { v: 86, duration: minTime, ease: "power2.inOut", onUpdate: render, onComplete: res }));

  Promise.all([ready, counting]).then(() => {
    gsap.to(counter, { v: 100, duration: 0.35, ease: "power1.out", onUpdate: render, onComplete: reveal });
  });

  function reveal() {
    fitTitles();
    const r = win.getBoundingClientRect();
    gsap.set(reel, { clipPath: inset(r.top, innerWidth - r.right, innerHeight - r.bottom, r.left, 6) });
    play(first);
    reelPlaying = true;
    active = 0;

    const tl = gsap.timeline({
      onComplete() {
        clearInterval(flicker);
        loader.remove();
        buildStage();
        buildSections();
        ScrollTrigger.addEventListener("refreshInit", fitTitles);
        ScrollTrigger.refresh();
        lenis?.start();
      },
    });
    tl.to($$(".loader-row", loader), { autoAlpha: 0, y: -10, duration: 0.4, ease: "power2.in" })
      .to(loader, { backgroundColor: "rgba(10,10,10,0)", duration: 0.01 })
      .to(win, { autoAlpha: 0, duration: 0.35 }, "<")
      .to(reel, { clipPath: fullInset(), duration: 1.5, ease: "expo.inOut" }, "-=0.05")
      .fromTo(reelVideos, { scale: 1.3 }, { scale: 1, duration: 2.2, ease: "expo.out" }, "<")
      .to(chars[0], { yPercent: 0, stagger: 0.05, duration: 1.3, ease: "expo.out" }, "-=0.75")
      .to(heroBits, { yPercent: 0, stagger: 0.1, duration: 1.1, ease: "expo.out" }, "<0.2")
      .to(metas[0], { autoAlpha: 1, duration: 0.8 }, "<")
      .to(".dock", { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out" }, "<0.1")
      .to(".scroll-hint", { autoAlpha: 1, duration: 0.6 }, "<0.3");
  }
})();
