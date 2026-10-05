// BS.Haus v2 — "The Reel"
// Loader → full-bleed showreel → scroll shrinks the reel into the first card of
// a horizontal strip → scroll / drag / arrow keys move through the projects.
// Cards are DOM links (layout, clicks, accessibility) mirrored by WebGL planes
// (curvature, velocity bend + RGB split, hover ripple, liquid snippet wipes).
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const scrollTo = (target, opts = {}) =>
    lenis
      ? lenis.scrollTo(target, { duration: 1.2, ...opts })
      : window.scrollTo({ top: typeof target === "number" ? target : target.offsetTop, behavior: opts.immediate ? "auto" : "smooth" });

  const stage = $(".stage");
  const pin = $(".stage-pin");
  const reel = $(".reel");
  const items = $$(".card"); // items[0] = the reel card, 1..N = projects
  const N = items.length - 1;
  const titles = $$(".big-title");
  const metas = $$(".meta");
  const indexBtns = $$(".stage-index button");
  const heroLine = $(".hero-line");
  const progressBar = $(".stage-progress i");

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

  // ------------------------------------------------------------ geometry
  let G = {};
  const measure = () => {
    const vw = innerWidth, vh = innerHeight;
    const cw = vw <= 760 ? vw * 0.76 : Math.min(vw * 0.5, 980);
    const ch = (cw * 10) / 16;
    const cy = vh * 0.46;
    G = { vw, vh, cw, ch, cy, top: cy - ch / 2, left: (vw - cw) / 2, gap: Math.max(16, vw * 0.018) };
    pin.style.setProperty("--card-bottom", `${G.top + G.ch}px`);
  };
  measure();
  const SIDE = 0.6; // neighbour scale
  // x offset (px) of an item `d` slots away from the centre, given variable widths
  const slotX = (d) => {
    const ad = Math.abs(d);
    const near = ((1 + SIDE) / 2) * G.cw + G.gap;
    const far = SIDE * G.cw + G.gap;
    return Math.sign(d) * (ad < 1 ? ad * near : near + (ad - 1) * far);
  };
  const inset = (t, r, b, l, rad) => `inset(${t}px ${r}px ${b}px ${l}px round ${rad}px)`;

  // ------------------------------------------------------------ reel playback
  let reelIdx = 0;
  let reelPlaying = false;
  const onReelChange = [];
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
      onReelChange.forEach((fn) => fn(next));
    })
  );
  const setReel = (on) => {
    if (on === reelPlaying) return;
    reelPlaying = on;
    const v = reelVideos[reelIdx];
    if (on) play(v); else v?.pause();
  };

  // ------------------------------------------------------------ WebGL mirror of the strip
  const GL = (() => {
    if (!window.THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "gl";
    pin.appendChild(renderer.domElement);
    root.classList.add("has-gl");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 10, 6000);
    const resize = () => {
      renderer.setSize(G.vw, G.vh);
      camera.aspect = G.vw / G.vh;
      camera.position.z = 1200;
      camera.fov = (2 * Math.atan(G.vh / 2 / 1200) * 180) / Math.PI; // 1 unit = 1px at z=0
      camera.updateProjectionMatrix();
    };

    const vertex = /* glsl */ `
      uniform vec2 uViewport; uniform float uCurve; uniform float uVelocity; uniform float uHover; uniform vec2 uMouse;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        float nx = world.x / uViewport.x;
        world.z -= nx * nx * uCurve;                                  // cylinder: edges recede
        world.z += sin(uv.x * 3.14159) * abs(uVelocity) * 140.0;       // bow while travelling
        world.y += sin(uv.x * 3.14159) * uVelocity * -18.0;
        float d = distance(uv, uMouse);
        world.z += uHover * 34.0 * smoothstep(0.55, 0.0, d);           // soft bulge under the cursor
        gl_Position = projectionMatrix * viewMatrix * world;
      }`;
    const fragment = /* glsl */ `
      uniform sampler2D uTex; uniform sampler2D uTex2; uniform vec2 uImg; uniform vec2 uImg2; uniform vec2 uSize;
      uniform float uMix; uniform float uVelocity; uniform float uHover; uniform vec2 uMouse; uniform float uTime;
      uniform float uFocus; uniform float uAlpha; uniform float uRadius;
      varying vec2 vUv;
      vec2 cover(vec2 uv, vec2 size, vec2 img) {
        float rs = size.x / size.y, ri = img.x / max(img.y, 1.0);
        vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
        return (uv - 0.5) * s + 0.5;
      }
      vec3 sampleSplit(sampler2D t, vec2 uv, float shift) {
        return vec3(texture2D(t, uv + vec2(shift, 0.0)).r, texture2D(t, uv).g, texture2D(t, uv - vec2(shift, 0.0)).b);
      }
      float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main() {
        vec2 uv = vUv;
        vec2 dir = uv - uMouse; float d = length(dir);
        uv += normalize(dir + 1e-5) * sin(d * 26.0 - uTime * 3.2) * exp(-d * 5.0) * 0.012 * uHover;  // ripple
        uv = (uv - 0.5) * (1.0 - 0.05 * uHover - 0.04 * uFocus) + 0.5;                                 // breathe in
        float shift = uVelocity * 0.018;

        // liquid wipe between snippets: a wavy diagonal front sweeps across, displacing both images
        float front = vUv.x * 0.75 + (1.0 - vUv.y) * 0.25 + sin(vUv.y * 9.0 + uTime * 1.5) * 0.035;
        float m = smoothstep(front - 0.18, front + 0.02, uMix * 1.25 - 0.05);
        vec2 uvA = uv + vec2(m * 0.06, 0.0);
        vec2 uvB = uv - vec2((1.0 - m) * 0.06, 0.0);
        vec3 a = sampleSplit(uTex, cover(uvA, uSize, uImg), shift);
        vec3 b = sampleSplit(uTex2, cover(uvB, uSize, uImg2), shift);
        vec3 col = mix(a, b, m);

        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(lum), col, 0.55 + 0.45 * uFocus) * (0.5 + 0.5 * uFocus);                      // neighbours recede
        vec2 p = (vUv - 0.5) * uSize;
        float alpha = 1.0 - smoothstep(-1.0, 1.0, rbox(p, uSize * 0.5, uRadius));
        gl_FragColor = vec4(col, alpha * uAlpha);
      }`;

    const geo = new THREE.PlaneGeometry(1, 1, 48, 24);
    const blank = new THREE.DataTexture(new Uint8Array([20, 20, 20, 255]), 1, 1, THREE.RGBAFormat);
    blank.needsUpdate = true;
    const imgLoader = new THREE.TextureLoader();
    const texFor = (src, onSize) => {
      const t = imgLoader.load(src, (tex) => onSize(tex.image.naturalWidth || tex.image.width, tex.image.naturalHeight || tex.image.height));
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      return t;
    };
    const vidTex = (video, onSize) => {
      const t = new THREE.VideoTexture(video);
      t.minFilter = THREE.LinearFilter;
      const size = () => video.videoWidth && onSize(video.videoWidth, video.videoHeight);
      video.addEventListener("loadedmetadata", size);
      size();
      return t;
    };

    const planes = items.map((el, i) => {
      const u = {
        uTex: { value: blank }, uTex2: { value: blank }, uImg: { value: new THREE.Vector2(16, 10) }, uImg2: { value: new THREE.Vector2(16, 10) },
        uSize: { value: new THREE.Vector2(1, 1) }, uViewport: { value: new THREE.Vector2(1, 1) }, uCurve: { value: 0 },
        uMix: { value: 0 }, uVelocity: { value: 0 }, uHover: { value: 0 }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 }, uFocus: { value: 0 }, uAlpha: { value: 0 }, uRadius: { value: 12 },
      };
      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: vertex, fragmentShader: fragment, transparent: true }));
      scene.add(mesh);
      const plane = { el, mesh, u, i, hover: 0, slides: [], slide: 0, video: null };
      if (i === 0) {
        const setReelTex = (v) => { u.uTex.value = vidTex(v, (w, h) => u.uImg.value.set(w, h)); };
        setReelTex(reelVideos[reelIdx]);
        onReelChange.push(setReelTex);
      } else {
        const video = $("video", el);
        if (video) {
          // show the cover until the clip is actually producing frames
          plane.video = video;
          const poster = $(".card-media img", el).getAttribute("src");
          u.uTex.value = texFor(poster, (w, h) => { if (!plane.live) u.uImg.value.set(w, h); });
          video.addEventListener("playing", () => {
            if (plane.live) return;
            plane.live = true;
            u.uTex.value = vidTex(video, (w, h) => u.uImg.value.set(w, h));
          });
        } else {
          plane.slides = $$(".card-media img", el).map((img) => {
            const s = { src: img.getAttribute("src"), tex: null, w: 16, h: 10 };
            s.tex = texFor(s.src, (w, h) => { s.w = w; s.h = h; if (plane.slide === plane.slides.indexOf(s)) u.uImg.value.set(w, h); });
            return s;
          });
          u.uTex.value = plane.slides[0].tex;
        }
      }
      return plane;
    });

    let slideTimer = 0;
    const startSlides = (k) => {
      clearInterval(slideTimer);
      const p = planes[k];
      if (!p || p.slides.length < 2) return;
      slideTimer = setInterval(() => {
        const next = (p.slide + 1) % p.slides.length;
        const s = p.slides[next];
        p.u.uTex2.value = s.tex;
        p.u.uImg2.value.set(s.w, s.h);
        gsap.fromTo(p.u.uMix, { value: 0 }, {
          value: 1, duration: 1.4, ease: "power2.inOut",
          onComplete() { p.u.uTex.value = s.tex; p.u.uImg.value.set(s.w, s.h); p.u.uMix.value = 0; p.slide = next; },
        });
      }, 2600);
    };

    const render = (state, time) => {
      const vel = state.vel;
      planes.forEach((p) => {
        const r = p.el.getBoundingClientRect();
        const visible = r.right > -200 && r.left < G.vw + 200 && state.alpha[p.i] > 0.001;
        p.mesh.visible = visible;
        if (!visible) return;
        p.mesh.position.set(r.left + r.width / 2 - G.vw / 2, G.vh / 2 - (r.top + r.height / 2), 0);
        p.mesh.scale.set(r.width, r.height, 1);
        const u = p.u;
        u.uSize.value.set(r.width, r.height);
        u.uViewport.value.set(G.vw, G.vh);
        u.uCurve.value = 520;
        u.uVelocity.value = vel;
        u.uTime.value = time;
        u.uFocus.value = state.focus[p.i];
        u.uAlpha.value = state.alpha[p.i];
        u.uRadius.value = 12 * (r.width / G.cw);
        p.hover = lerp(p.hover, state.hovered === p.i && Math.abs(vel) < 0.15 ? 1 : 0, 0.08);
        u.uHover.value = p.hover;
        if (state.hovered === p.i) u.uMouse.value.lerp(state.mouse, 0.2);
      });
      renderer.render(scene, camera);
    };

    return { resize, render, startSlides, stopSlides: () => clearInterval(slideTimer), planes };
  })();

  // ------------------------------------------------------------ DOM-only snippet fallback
  let domSlideTimer = 0;
  const startDomSlides = (k) => {
    clearInterval(domSlideTimer);
    const imgs = $$(".card-media img", items[k]);
    if (imgs.length < 2) return;
    let i = imgs.findIndex((im) => im.classList.contains("is-on"));
    domSlideTimer = setInterval(() => {
      imgs[i].classList.remove("is-on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("is-on");
    }, 1800);
  };

  // ------------------------------------------------------------ active project: titles, meta, media
  let active = -1;
  const shown = titles.map((_, i) => i === 0);
  const setActive = (k) => {
    if (k === active) return;
    const prev = active;
    active = k;
    setReel(k === 0);
    items.forEach((el, i) => {
      const v = i > 0 && $("video", el);
      if (!v) return;
      if (i === k) { loadVideo(v); v.addEventListener("playing", () => v.classList.add("is-playing"), { once: true }); play(v); }
      else v.pause();
    });
    [k + 1, k + 2].forEach((j) => j <= N && loadVideo($("video", items[j])));
    if (GL) GL.startSlides(k); else startDomSlides(k);
    indexBtns.forEach((b, i) => b.classList.toggle("is-active", i === k - 1));

    // Every title except the active one heads out (robust to fast flings through several projects).
    titles.forEach((_, i) => {
      if (i === k) return;
      if (shown[i]) gsap.to(chars[i], { yPercent: -140, stagger: 0.02, duration: 0.45, ease: "power3.in", overwrite: true });
      shown[i] = false;
      if (i !== prev) gsap.set(metas[i], { autoAlpha: 0, overwrite: true });
    });
    if (prev >= 0) gsap.to(metas[prev], { autoAlpha: 0, y: -8, duration: 0.3, overwrite: true });
    shown[k] = true;
    gsap.fromTo(chars[k], { yPercent: 140 }, { yPercent: 0, stagger: 0.03, duration: 0.9, ease: "expo.out", delay: prev >= 0 ? 0.18 : 0, overwrite: true });
    gsap.fromTo(metas[k], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, delay: 0.25, overwrite: true });
  };

  // ------------------------------------------------------------ the stage: scroll → (phase, position)
  const PHASE = 1, PER = 0.62, TAIL = 0.35; // in viewport heights
  const total = PHASE + N * PER + TAIL;
  let stageST = null;
  const scrollForPos = (pos) => stageST.start + ((PHASE + pos * PER) / total) * (stageST.end - stageST.start);

  const S = { phase: 0, pos: 0, smooth: 0, vel: 0, hovered: -1, mouse: GL ? new THREE.Vector2(0.5, 0.5) : null, alpha: [], focus: [] };

  const layout = () => {
    const ph = easeInOut(clamp(S.phase, 0, 1));
    const enter = 1 - ph; // neighbours slide in from the right while the reel shrinks
    items.forEach((el, i) => {
      const d = i - S.smooth;
      const ad = Math.abs(d);
      const s = lerp(1, SIDE, clamp(ad, 0, 1));
      const x = slotX(d) + (i > 0 ? enter * G.vw * 0.6 : 0);
      const a = (i === 0 ? (S.phase >= 1 ? 1 : 0) : ph) * clamp(3.4 - ad, 0, 1);
      S.alpha[i] = a;
      S.focus[i] = 1 - clamp(ad, 0, 1);
      const rot = GL ? 0 : clamp(-d, -1.5, 1.5) * 14;
      el.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(2)}px) scale(${s.toFixed(4)})${rot ? ` rotateY(${rot.toFixed(2)}deg)` : ""}`;
      el.style.opacity = GL ? 1 : a;
      el.style.visibility = a > 0.001 ? "visible" : "hidden";
      el.style.zIndex = String(100 - Math.round(ad * 10));
    });
    // the DOM reel owns the frame until it lands exactly on item 0
    reel.style.visibility = S.phase >= 1 ? "hidden" : "visible";
    reel.style.clipPath = inset(lerp(0, G.top, ph), lerp(0, G.left, ph), lerp(0, G.vh - G.top - G.ch, ph), lerp(0, G.left, ph), lerp(0, 12, ph));
    gsap.set(heroLine, { autoAlpha: clamp(1 - S.phase * 2.2, 0, 1), y: -24 * clamp(S.phase * 2, 0, 1) });
    gsap.set(".scroll-hint", { autoAlpha: clamp(1 - S.phase * 4, 0, 1) });
    gsap.set([".stage-index", ".stage-progress"], { autoAlpha: clamp((S.phase - 0.6) * 3, 0, 1) });
    progressBar.style.height = `${(S.smooth / N) * 100}%`;
  };

  const buildStage = () => {
    stageST = ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: () => `+=${innerHeight * total}`,
      pin,
      invalidateOnRefresh: true,
    });
    let last = performance.now();
    gsap.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(64, now - last) / 16.67;
      last = now;
      const u = clamp(stageST.progress, 0, 1) * total;
      S.phase = clamp(u / PHASE, 0, 1);
      S.pos = clamp((u - PHASE) / PER, 0, N);
      const before = S.smooth;
      S.smooth = lerp(S.smooth, S.pos, 1 - Math.pow(1 - 0.16, dt));
      if (Math.abs(S.smooth - S.pos) < 0.0005) S.smooth = S.pos;
      S.vel = lerp(S.vel, clamp((S.smooth - before) * 9, -1, 1), 0.2);
      layout();
      setActive(S.phase < 1 ? 0 : Math.round(S.smooth));
      if (GL && stageST.isActive) GL.render(S, now / 1000);
      else if (GL && !stageST.isActive && stageST.progress < 1) GL.render(S, now / 1000);
    });
  };

  // ------------------------------------------------------------ snapping, drag, keys
  let snapTimer = 0;
  let lastDir = 1;
  let dragging = false;
  const settle = () => {
    if (!stageST || dragging) return;
    const y = scrollY();
    if (y < stageST.start - 2 || y > stageST.end - 4) return;
    const u = ((y - stageST.start) / (stageST.end - stageST.start)) * total;
    let target;
    if (u < PHASE) target = lastDir > 0 ? (u > 0.08 ? scrollForPos(0) : stageST.start) : (u < PHASE - 0.08 ? stageST.start : scrollForPos(0));
    else {
      const p = (u - PHASE) / PER;
      if (p >= N) return;
      const f = p - Math.floor(p);
      const idx = lastDir > 0 ? (f > 0.12 ? Math.ceil(p) : Math.floor(p)) : (f < 0.88 ? Math.floor(p) : Math.ceil(p));
      target = scrollForPos(clamp(idx, 0, N));
    }
    if (Math.abs(target - y) > 2) scrollTo(target, { duration: 1, easing: (x) => 1 - Math.pow(1 - x, 4) });
  };
  lenis?.on("scroll", ({ velocity, direction }) => {
    if (direction) lastDir = direction;
    clearTimeout(snapTimer);
    if (Math.abs(velocity) < 30) snapTimer = setTimeout(settle, 160);
  });

  const goTo = (k) => scrollTo(scrollForPos(clamp(k, 0, N)), { duration: 1.1 });
  indexBtns.forEach((b) => b.addEventListener("click", () => goTo(+b.dataset.goto)));
  addEventListener("keydown", (e) => {
    if (!stageST?.isActive || !["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault();
    goTo(Math.round(S.pos) + (e.key === "ArrowRight" ? 1 : -1));
  });

  // Horizontal drag through the strip (mouse or touch); vertical touch still scrolls.
  let drag = null;
  let suppressClick = false;
  pin.addEventListener("pointerdown", (e) => {
    if (!stageST?.isActive || S.phase < 0.98 || e.button > 0) return;
    clearTimeout(snapTimer);
    lenis?.scrollTo(scrollY(), { immediate: true, force: true }); // cancel any running snap
    drag = { x: e.clientX, y: e.clientY, start: scrollY(), startPos: S.pos, pos: S.pos, moved: false, lastX: e.clientX, t: performance.now(), v: 0 };
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) {
      drag.moved = dragging = true;
      pin.classList.add("is-dragging");
    }
    if (!drag.moved) return;
    const now = performance.now();
    drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.t);
    drag.lastX = e.clientX;
    drag.t = now;
    const pxPerSlot = ((1 + SIDE) / 2) * G.cw + G.gap;
    const scrollPerSlot = scrollForPos(1) - scrollForPos(0);
    drag.pos = clamp(drag.startPos - dx / pxPerSlot, 0, N);
    scrollTo(scrollForPos(drag.pos), { immediate: true });
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 60);
      const fling = clamp(-drag.v * 0.4, -1, 1); // slots
      const target = Math.round(clamp(drag.pos + fling, 0, N));
      dragging = false;
      goTo(target);
    }
    pin.classList.remove("is-dragging");
    drag = null;
  };
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", endDrag);
  pin.addEventListener("click", (e) => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);

  // Hover state for the WebGL ripple + "keep the real image" on navigation for the page morph.
  items.forEach((el, i) => {
    el.addEventListener("pointermove", (e) => {
      if (!S.mouse) return;
      const r = el.getBoundingClientRect();
      S.hovered = i;
      S.mouse.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    });
    el.addEventListener("pointerleave", () => { if (S.hovered === i) S.hovered = -1; });
    const link = $("a.card-link", el);
    link?.addEventListener("click", (e) => {
      if (suppressClick) return;
      if (i !== Math.round(S.pos)) { e.preventDefault(); goTo(i); return; } // side cards: bring to centre first
      el.classList.add("is-leaving");
    });
  });
  addEventListener("pageshow", () => items.forEach((el) => el.classList.remove("is-leaving")));

  // ------------------------------------------------------------ dock
  const navLinks = $$(".dock a[data-nav]");
  const setNav = (name) => navLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.nav === name));
  $$(".dock a[href^='#']").forEach((a) =>
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = a.getAttribute("href").slice(1);
      if (id === "top") scrollTo(0);
      else if (id === "work") goTo(1);
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
      let t = e.target.closest("[data-cursor]");
      let text = t ? t.dataset.cursor : "";
      const card = e.target.closest(".card");
      if (card && +card.dataset.index !== Math.round(S.pos) && +card.dataset.index > 0) text = "Next";
      label.textContent = text;
      cursor.classList.toggle("has-label", !!t && text !== "Scroll");
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
  const wstate = letters.map(() => ({ w: 100, g: 800 }));
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
      const s = wstate[i];
      s.w += (84 + 41 * t - s.w) * 0.12;
      s.g += (420 + 480 * t - s.g) * 0.12;
      el.style.fontVariationSettings = `"wdth" ${s.w.toFixed(1)}, "wght" ${s.g.toFixed(0)}`;
    });
  });

  // ------------------------------------------------------------ resize
  const onResize = () => { measure(); fitTitles(); GL?.resize(); };
  ScrollTrigger.addEventListener("refreshInit", onResize);
  GL?.resize();

  // ------------------------------------------------------------ loader → intro
  const loader = $(".loader");
  const frames = $$(".loader-window img");
  const win = $(".loader-window");
  const count = $(".loader-count");
  let seen = false;
  try { seen = sessionStorage.getItem("bs-v2-seen") === "1"; sessionStorage.setItem("bs-v2-seen", "1"); } catch {}

  gsap.set(chars.flat(), { yPercent: 140 });
  gsap.set(metas, { autoAlpha: 0 });
  items.forEach((el) => (el.style.visibility = "hidden"));
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
    reel.style.clipPath = inset(r.top, innerWidth - r.right, innerHeight - r.bottom, r.left, 6);
    play(first);
    reelPlaying = true;
    active = 0;

    const clip = { t: 0 };
    const tl = gsap.timeline({
      onComplete() {
        clearInterval(flicker);
        loader.remove();
        buildStage();
        buildSections();
        ScrollTrigger.refresh();
        lenis?.start();
      },
    });
    tl.to($$(".loader-row", loader), { autoAlpha: 0, y: -10, duration: 0.4, ease: "power2.in" })
      .to(loader, { backgroundColor: "rgba(10,10,10,0)", duration: 0.01 })
      .to(win, { autoAlpha: 0, duration: 0.35 }, "<")
      .to(clip, {
        t: 1, duration: 1.5, ease: "expo.inOut",
        onUpdate: () => {
          const k = clip.t;
          reel.style.clipPath = inset(lerp(r.top, 0, k), lerp(innerWidth - r.right, 0, k), lerp(innerHeight - r.bottom, 0, k), lerp(r.left, 0, k), lerp(6, 0, k));
        },
      }, "-=0.05")
      .fromTo(reelVideos, { scale: 1.3 }, { scale: 1, duration: 2.2, ease: "expo.out" }, "<")
      .to(chars[0], { yPercent: 0, stagger: 0.05, duration: 1.3, ease: "expo.out" }, "-=0.75")
      .to(heroBits, { yPercent: 0, stagger: 0.1, duration: 1.1, ease: "expo.out" }, "<0.2")
      .to(metas[0], { autoAlpha: 1, duration: 0.8 }, "<")
      .to(".dock", { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out" }, "<0.1")
      .to(".scroll-hint", { autoAlpha: 1, duration: 0.6 }, "<0.3");
  }
})();
