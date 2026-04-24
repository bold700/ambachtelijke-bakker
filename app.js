(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- Smooth scroll (Lenis) + central rAF loop -----
  // Drives the scroll position with easing and exposes one rAF hook that
  // other animated bits (video scrub lerp) can tap into.
  const subscribers = new Set();
  let lenis = null;

  if (!reduced && window.Lenis) {
    lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      lerp: 0.2,
    });

    // Route in-page anchor clicks through Lenis. For stage captions (which
    // sit position:absolute inside a sticky pin) we compute the scrollY
    // that makes that caption active in the stage — otherwise the browser
    // sees offsetTop=0 and goes nowhere.
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
            // Center the caption in its slice so it's fully active on arrival
            const target = trackTop + total * ((idx + 0.5) / N);
            lenis.scrollTo(target, { duration: 1.4 });
            return;
          }
        }
        lenis.scrollTo(t, { offset: 0, duration: 1.4 });
      });
    });
  }

  const tick = (time) => {
    if (lenis) lenis.raf(time);
    subscribers.forEach((fn) => fn(time));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ----- Today's date chip -----
  const dateEl = document.getElementById("today-date");
  if (dateEl) {
    const d = new Date();
    const days = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
    dateEl.textContent = `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
  }

  // ----- Entrance reveals (single elements + groups) -----
  const revealEls = document.querySelectorAll("[data-reveal]");
  const staggerEls = document.querySelectorAll("[data-stagger]");

  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
    staggerEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
    staggerEls.forEach((el) => io.observe(el));
  }

  // ----- Video scroll scrubber (shared by hero + chapters) -----
  // Preload the source as a blob (Python's http.server doesn't support Range,
  // without which Chromium reports seekable=0). Same URL fetched once thanks
  // to the http cache.
  const blobCache = new Map();
  const toBlob = (url) => {
    if (!blobCache.has(url)) {
      blobCache.set(url,
        fetch(url).then((r) => r.blob()).then((b) => URL.createObjectURL(b))
      );
    }
    return blobCache.get(url);
  };

  const makeScrubber = (track, video, opts = {}) => {
    if (!track || !video) return;
    const { onProgress, maxVelocity = 3 } = opts;
    //   maxVelocity = seconds of video per second of real time. 3 = gentle
    //   cinematic scrub. Caps fast-scrolling from fast-forwarding the video.
    let duration = 8;

    const syncMeta = () => {
      if (!Number.isNaN(video.duration) && video.duration > 0) duration = video.duration;
    };
    video.addEventListener("loadedmetadata", syncMeta);
    video.addEventListener("durationchange", syncMeta);

    const srcEl = video.querySelector("source");
    const srcUrl = srcEl ? new URL(srcEl.getAttribute("src"), location.href).href : video.currentSrc;
    toBlob(srcUrl).then((blobUrl) => { video.src = blobUrl; video.load(); }).catch(() => {});

    video.pause();
    video.currentTime = 0;

    let targetTime = 0;
    let currentTime = 0;
    let lastT = performance.now();

    const update = (time) => {
      const now = typeof time === "number" ? time : performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastT) / 1000));
      lastT = now;

      const r = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      const raw = total > 0 ? -r.top / total : 0;
      const p = Math.max(0, Math.min(1, raw));

      targetTime = p * Math.max(0.01, duration - 0.02);

      // Mild lerp keeps micro-jitter out, cap only clamps extreme scrollbar drags.
      const desired = (targetTime - currentTime) * 0.28;
      const maxStep = maxVelocity * dt;
      const step = Math.sign(desired) * Math.min(Math.abs(desired), maxStep);
      currentTime += step;

      if (Math.abs(currentTime - (video.currentTime || 0)) > 0.02) {
        try { video.currentTime = currentTime; } catch (_) {}
      }
      video.style.setProperty("--video-scale", (1.02 + p * 0.06).toFixed(3));

      if (onProgress) onProgress(p);
    };

    subscribers.add(update);
    window.addEventListener("resize", update);
  };

  // ----- Dock theme: white text when a dark section sits behind it -----
  const dock = document.querySelector(".dock");
  if (dock) {
    const darkSections = document.querySelectorAll(".hero, .stage, .today, .foot");
    const probeYFromTop = 18 + 29; // dock top + ~half its height
    const checkTheme = () => {
      let overDark = false;
      for (const sec of darkSections) {
        const r = sec.getBoundingClientRect();
        if (r.top <= probeYFromTop && r.bottom >= probeYFromTop) { overDark = true; break; }
      }
      dock.classList.toggle("dock--on-dark", overDark);
    };
    subscribers.add(checkTheme);
    window.addEventListener("resize", checkTheme);
    checkTheme();
  }

  // ----- Stages (seamless scrollytelling: one sticky pin, N videos + captions crossfade) -----
  const makeStage = (stage) => {
    const track = stage.querySelector(".stage__track");
    const videos = Array.from(stage.querySelectorAll(".stage__video"));
    const captions = Array.from(stage.querySelectorAll(".stage__caption"));
    const progressBar = stage.querySelector(".stage__progress span");
    const N = videos.length;
    if (!track || !N) return;

    // Lazy blob-preload: only the active video gets loaded up front; neighbors
    // load as the user approaches. Saves bandwidth + initial page-load time.
    const loadVideo = (v) => {
      if (!v || v._loaded) return;
      v._loaded = true;
      const srcEl = v.querySelector("source");
      const url = srcEl ? new URL(srcEl.getAttribute("src"), location.href).href : v.currentSrc;
      toBlob(url).then((blobUrl) => { v.src = blobUrl; v.load(); }).catch(() => {});
    };
    videos.forEach((v) => { v.pause(); try { v.currentTime = 0; } catch (_) {} });
    loadVideo(videos[0]); // first video ready immediately

    // Per-video scrub state (target/current)
    const state = videos.map(() => ({ current: 0, target: 0 }));
    let lastT = performance.now();
    let activeIdx = -1;

    const update = (time) => {
      const now = typeof time === "number" ? time : performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastT) / 1000));
      lastT = now;

      const r = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      const raw = total > 0 ? -r.top / total : 0;
      const p = Math.max(0, Math.min(1, raw));
      const slice = 1 / N;
      const idx = Math.min(N - 1, Math.floor(p / slice));
      const local = Math.max(0, Math.min(1, (p - idx * slice) / slice));

      // Swap active classes only when idx changes (avoid thrash)
      if (idx !== activeIdx) {
        videos.forEach((v, i) => v.classList.toggle("is-active", i === idx));
        captions.forEach((c, i) => c.classList.toggle("is-active", i === idx));
        activeIdx = idx;
        // Preload active + adjacent videos so the next chapter is ready
        loadVideo(videos[idx]);
        if (idx + 1 < N) loadVideo(videos[idx + 1]);
        if (idx - 1 >= 0) loadVideo(videos[idx - 1]);
        // Snap scrub state to current scroll position. Without this the
        // chapter remembers where it left off and plays backward/forward
        // when re-entered from a different scroll direction.
        const snapDur = videos[idx].duration || 8;
        const snapT = local * Math.max(0.01, snapDur - 0.02);
        state[idx].current = state[idx].target = snapT;
        try { videos[idx].currentTime = snapT; } catch (_) {}
      }

      // Scrub active video with tight lerp + velocity cap (1× real-time)
      // Cap = dt means the video never advances faster than its natural
      // playback rate, no matter how fast the scroll is going.
      const v = videos[idx];
      const s = state[idx];
      const dur = v.duration || 8;
      s.target = local * Math.max(0.01, dur - 0.02);
      const delta = s.target - s.current;
      const desired = delta * 0.4;
      const maxStep = dt;
      let step = Math.sign(desired) * Math.min(Math.abs(desired), maxStep);
      if (Math.abs(delta) < 0.01) { s.current = s.target; step = 0; }
      else s.current += step;
      if (Math.abs(s.current - (v.currentTime || 0)) > 0.02) {
        try { v.currentTime = s.current; } catch (_) {}
      }

      // Parallax the active caption's big number
      const num = captions[idx].querySelector("[data-parallax]");
      if (num) {
        const speed = parseFloat(num.dataset.parallaxSpeed || "0.08");
        const maxPx = speed * 200;
        const y = (0.5 - local) * 2 * maxPx;
        num.style.setProperty("--py", `${y.toFixed(2)}px`);
      }

      // Scroll-linked card drift: text slides gently upward through its slice.
      // From +60px at local=0 down to -60px at local=1 — 120px total range.
      const card = captions[idx].querySelector(".chapter__card, .hero__frame");
      if (card) {
        const drift = (0.5 - local) * 120;
        card.style.setProperty("--drift", `${drift.toFixed(1)}px`);
      }

      // Overall stage progress bar (shared across all chapters)
      if (progressBar) progressBar.style.setProperty("--p", `${(p * 100).toFixed(1)}%`);
    };

    subscribers.add(update);
    window.addEventListener("resize", update);
  };

  if (!reduced) {
    document.querySelectorAll("[data-stage]").forEach(makeStage);
  } else {
    // Reduced motion: activate first caption + video per stage, pick a decent frame
    document.querySelectorAll("[data-stage]").forEach((stage) => {
      stage.querySelectorAll(".stage__video").forEach((v, i) => {
        if (i === 0) v.classList.add("is-active");
        v.addEventListener("loadedmetadata", () => {
          try { v.currentTime = Math.max(0, (v.duration || 8) * 0.5); } catch (_) {}
        });
      });
      stage.querySelectorAll(".stage__caption").forEach((c, i) => {
        if (i === 0) c.classList.add("is-active");
      });
    });
  }

  // iOS gesture unlock — a single tap is enough to green-light seek on all videos
  if (!reduced) {
    const unlock = () => {
      document.querySelectorAll("video").forEach((v) => {
        v.play().then(() => v.pause()).catch(() => {});
      });
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("click", unlock, { once: true });
  }

  // ----- Magnetic buttons -----
  if (!reduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      let raf = 0;
      const strength = 14;
      const onMove = (ev) => {
        const r = el.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        const x = (dx / r.width) * strength;
        const y = (dy / r.height) * strength;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
      };
      const reset = () => {
        cancelAnimationFrame(raf);
        el.style.transform = "translate3d(0,0,0)";
      };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", reset);
      el.addEventListener("blur", reset);
    });
  }

  // ----- Live voorraad ticker -----
  // Randomly decrements products over time to simulate orders coming in.
  // Updates the progress bar width, count, pill label, and sold-out state.
  const products = Array.from(document.querySelectorAll(".product"));
  if (products.length) {
    const updatedEl = document.getElementById("today-updated");

    const pillLabel = (left, total) => {
      if (left <= 0) return { text: "op", cls: "product__pill--sold" };
      if (left <= 3) return { text: `nog ${left}`, cls: "product__pill--low" };
      const ratio = left / total;
      if (ratio > 0.6) return { text: "ruim", cls: "" };
      if (ratio > 0.25) return { text: "beschikbaar", cls: "" };
      return { text: "laatste paar", cls: "" };
    };

    const renderProduct = (el) => {
      const total = parseInt(el.dataset.total, 10);
      const left = parseInt(el.dataset.left, 10);
      const fill = Math.max(0, Math.min(100, (left / total) * 100));

      el.querySelector(".product__bar span").style.setProperty("--fill", `${fill.toFixed(1)}%`);
      el.querySelector(".product__left").textContent = left;
      el.querySelector(".product__total").textContent = total;
      el.classList.toggle("product--sold", left <= 0);

      const pill = el.querySelector(".product__pill");
      const meta = pillLabel(left, total);
      pill.textContent = meta.text;
      pill.classList.remove("product__pill--low", "product__pill--sold");
      if (meta.cls) pill.classList.add(meta.cls);
    };

    products.forEach(renderProduct);

    if (!reduced) {
      const tick = () => {
        // Only decrement products that have stock above their per-product minimum
        // so the page always shows several filled items.
        const available = products.filter(p => {
          const left = parseInt(p.dataset.left, 10);
          const min = parseInt(p.dataset.min || "0", 10);
          return left > min;
        });
        if (available.length) {
          const p = available[Math.floor(Math.random() * available.length)];
          p.dataset.left = Math.max(0, parseInt(p.dataset.left, 10) - 1);
          renderProduct(p);
          if (updatedEl) updatedEl.textContent = "net";
        }
      };

      // Slow tick — 25 to 60 seconds per order, so the list doesn't drain
      // during a single visit.
      const scheduleTick = () => {
        setTimeout(() => { tick(); scheduleTick(); }, 25000 + Math.random() * 35000);
      };
      scheduleTick();

      // "Net" → "1 min geleden" → "3 min geleden" rolling label
      if (updatedEl) {
        let minutes = 0;
        setInterval(() => {
          minutes = (minutes + 1) % 9;
          updatedEl.textContent = minutes === 0 ? "net" : `${minutes} min geleden`;
        }, 60000);
      }
    }
  }

  // Keep the header date chip (stage 1 caption 5) in sync with live date chip
  const todayDateLive = document.getElementById("today-date-live");
  if (todayDateLive) {
    const d = new Date();
    const days = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
    todayDateLive.textContent = `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
  }
})();
