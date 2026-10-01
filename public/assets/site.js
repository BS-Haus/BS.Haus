// BS.Haus — progressive enhancement only; every page works without this file.
(() => {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mobile nav sheet
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.firstElementChild.textContent = open ? "Close" : "Menu";
    });
  }

  // Scroll reveal
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // Hero reel: plays each clip once, then advances; index buttons jump between clips.
  const hero = document.querySelector("[data-reel]");
  if (hero) {
    const clips = [...hero.querySelectorAll("video")];
    const buttons = [...hero.querySelectorAll(".reel-index button")];
    const caption = hero.querySelector("[data-reel-caption]");
    let current = -1;
    let raf = 0;

    const tick = () => {
      const v = clips[current];
      const bar = buttons[current]?.querySelector(".bar i");
      if (v && bar && v.duration) bar.style.width = `${(v.currentTime / v.duration) * 100}%`;
      raf = requestAnimationFrame(tick);
    };

    const show = (i) => {
      if (i === current) return;
      const prev = clips[current];
      current = (i + clips.length) % clips.length;
      const v = clips[current];
      buttons.forEach((b, j) => {
        b.setAttribute("aria-current", String(j === current));
        const bar = b.querySelector(".bar i");
        if (bar) bar.style.width = j < current ? "100%" : "0%";
      });
      if (caption) caption.textContent = v.dataset.caption || "";
      if (v.preload !== "auto") v.preload = "auto";
      v.currentTime = 0;
      v.classList.add("is-active");
      v.play().catch(() => {});
      if (prev && prev !== v) {
        prev.classList.remove("is-active");
        setTimeout(() => prev.pause(), 900);
      }
      // warm up the next clip
      const next = clips[(current + 1) % clips.length];
      if (next.preload === "none") next.preload = "metadata";
    };

    clips.forEach((v, i) => {
      v.loop = clips.length === 1 || reduced;
      v.addEventListener("ended", () => show(i + 1));
    });
    buttons.forEach((b, i) => b.addEventListener("click", () => show(i)));
    show(0);
    if (!reduced) raf = requestAnimationFrame(tick);

    // Pause off-screen to save battery/bandwidth
    new IntersectionObserver(([e]) => {
      const v = clips[current];
      if (!v) return;
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }).observe(hero);
  }

  // Work cards with a video: play when in view (touch) or on hover (pointer).
  const cards = document.querySelectorAll(".work-card[data-video]");
  if (cards.length && !reduced) {
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const ensure = (card) => {
      let v = card.querySelector("video");
      if (!v) {
        v = document.createElement("video");
        v.src = card.dataset.video;
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
        v.setAttribute("aria-hidden", "true");
        v.addEventListener("playing", () => v.classList.add("is-playing"));
        card.querySelector(".media").appendChild(v);
      }
      return v;
    };
    if (fine) {
      cards.forEach((card) => {
        card.addEventListener("mouseenter", () => ensure(card).play().catch(() => {}));
        card.addEventListener("mouseleave", () => card.querySelector("video")?.pause());
      });
    } else {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) ensure(e.target).play().catch(() => {});
          else e.target.querySelector("video")?.pause();
        }
      }, { threshold: 0.6 });
      cards.forEach((c) => io.observe(c));
    }
  }

  // Inline case-study videos: only play while visible.
  const inline = document.querySelectorAll("video[data-autoplay]");
  if (inline.length) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !reduced) e.target.play().catch(() => {}); else e.target.pause();
      }
    }, { threshold: 0.25 });
    inline.forEach((v) => io.observe(v));
  }
})();
