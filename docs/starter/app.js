/* =====================================================================
   Scroll Stage — minimal starter (vanilla JS, ~3KB minified)
   ===================================================================== */

(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const subscribers = new Set();

  /* ---------- Lenis smooth scroll + central rAF ---------- */
  const lenis = !reduced && window.Lenis
    ? new Lenis({
        duration: 0.8,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        lerp: 0.2,
      })
    : null;

  const tick = (time) => {
    lenis?.raf(time);
    subscribers.forEach((fn) => fn(time));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* ---------- Lazy blob preload (works on servers without Range) ---------- */
  const blobCache = new Map();
  const toBlob = (url) => {
    if (!blobCache.has(url)) {
      blobCache.set(url, fetch(url).then((r) => r.blob()).then((b) => URL.createObjectURL(b)));
    }
    return blobCache.get(url);
  };

  /* ---------- Stage scrubber ---------- */
  const makeStage = (stage) => {
    const track = stage.querySelector(".stage__track");
    const videos = Array.from(stage.querySelectorAll(".stage__video"));
    const captions = Array.from(stage.querySelectorAll(".stage__caption"));
    const N = videos.length;
    if (!track || !N) return;

    const state = videos.map(() => ({ current: 0, target: 0 }));
    let lastT = performance.now();
    let activeIdx = -1;

    const loadVideo = (v) => {
      if (!v || v._loaded) return;
      v._loaded = true;
      const srcEl = v.querySelector("source");
      const url = srcEl ? new URL(srcEl.getAttribute("src"), location.href).href : v.currentSrc;
      toBlob(url).then((blobUrl) => { v.src = blobUrl; v.load(); }).catch(() => {});
    };
    videos.forEach((v) => { v.pause(); try { v.currentTime = 0; } catch (_) {} });
    loadVideo(videos[0]);

    const update = (time) => {
      const now = typeof time === "number" ? time : performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastT) / 1000));
      lastT = now;

      const r = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, total > 0 ? -r.top / total : 0));
      const slice = 1 / N;
      const idx = Math.min(N - 1, Math.floor(p / slice));
      const local = Math.max(0, Math.min(1, (p - idx * slice) / slice));

      if (idx !== activeIdx) {
        videos.forEach((v, i) => v.classList.toggle("is-active", i === idx));
        captions.forEach((c, i) => c.classList.toggle("is-active", i === idx));
        activeIdx = idx;
        loadVideo(videos[idx]);
        if (idx + 1 < N) loadVideo(videos[idx + 1]);
        if (idx - 1 >= 0) loadVideo(videos[idx - 1]);
        // Snap state to scroll position to prevent backward lerp on re-entry
        const dur = videos[idx].duration || 8;
        const snap = local * Math.max(0.01, dur - 0.02);
        state[idx].current = state[idx].target = snap;
        try { videos[idx].currentTime = snap; } catch (_) {}
      }

      // Scrub: lerp toward target, capped at 1× real-time
      const v = videos[idx];
      const s = state[idx];
      const dur = v.duration || 8;
      s.target = local * Math.max(0.01, dur - 0.02);
      const delta = s.target - s.current;
      const desired = delta * 0.4;
      const maxStep = dt;
      const step = Math.sign(desired) * Math.min(Math.abs(desired), maxStep);
      if (Math.abs(delta) < 0.01) s.current = s.target;
      else s.current += step;
      if (Math.abs(s.current - (v.currentTime || 0)) > 0.02) {
        try { v.currentTime = s.current; } catch (_) {}
      }
    };

    subscribers.add(update);
    window.addEventListener("resize", update);
  };

  document.querySelectorAll("[data-stage]").forEach(makeStage);

  /* ---------- Anchor scroll: maps #caption-id to its scroll position ---------- */
  if (lenis) {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        if (!id) return;
        const t = document.getElementById(id);
        if (!t) return;
        e.preventDefault();

        const cap = t.closest(".stage__caption");
        if (cap) {
          const stage = cap.closest("[data-stage]");
          const track = stage?.querySelector(".stage__track");
          const captions = stage?.querySelectorAll(".stage__caption");
          if (track && captions) {
            const idx = Array.from(captions).indexOf(cap);
            const N = captions.length;
            const total = track.offsetHeight - window.innerHeight;
            const trackTop = track.getBoundingClientRect().top + window.scrollY;
            const target = trackTop + total * ((idx + 0.5) / N);
            lenis.scrollTo(target, { duration: 1.4 });
            return;
          }
        }
        lenis.scrollTo(t, { offset: 0, duration: 1.4 });
      });
    });
  }

  /* ---------- iOS gesture unlock for muted video seek ---------- */
  if (!reduced) {
    const unlock = () => {
      document.querySelectorAll("video").forEach((v) => v.play().then(() => v.pause()).catch(() => {}));
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("click", unlock, { once: true });
  }
})();
