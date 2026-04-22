/* ============================================================
   Bryson Bargas — Portfolio script
   - Scroll reset on load
   - Theme toggle (dark/light, persisted)
   - Mobile nav toggle
   - Scroll progress bar
   - Active nav highlighting (IntersectionObserver)
   - Scroll-reveal animations
   - Card 3D tilt on hover
   - Back-to-top
   - Certifications carousel (infinite loop, drag momentum, wheel horizontal)
   - Auto-update footer year
   ============================================================ */

// ------------------------------------------------------------
// Reset scroll position on load so anchors don't carry over
// ------------------------------------------------------------
(function scrollReset() {
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch {}
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  requestAnimationFrame(() => { root.style.scrollBehavior = prev; });
})();

// (Theme toggle and mobile-nav toggle removed — not needed.)

// ------------------------------------------------------------
// Header shadow on scroll + scroll progress
// ------------------------------------------------------------
(function scrollEffects() {
  const header = document.getElementById("siteHeader");
  const bar = document.getElementById("scrollBar");
  const top = document.getElementById("backToTop");

  const onScroll = () => {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (y / docH) * 100 : 0;

    if (header) header.classList.toggle("is-scrolled", y > 10);
    if (bar) bar.style.width = pct + "%";
    if (top) top.classList.toggle("show", y > 400);
  };

  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (top) top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();

// ------------------------------------------------------------
// Active nav highlighting via IntersectionObserver
// ------------------------------------------------------------
(function activeNav() {
  const links = document.querySelectorAll(".main-nav a[data-nav]");
  if (!links.length) return;

  const linkMap = new Map();
  links.forEach((a) => {
    const id = a.getAttribute("href")?.slice(1);
    if (id) linkMap.set(id, a);
  });

  const sections = [...linkMap.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const io = new IntersectionObserver(
    (entries) => {
      // Pick the section with the largest intersection ratio as "active"
      let best = null;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      }
      if (!best) return;

      links.forEach((a) => a.classList.remove("active"));
      const a = linkMap.get(best.target.id);
      if (a) a.classList.add("active");
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  sections.forEach((s) => io.observe(s));
})();

// ------------------------------------------------------------
// Scroll reveal
// ------------------------------------------------------------
(function reveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  // Stagger siblings within a grid for a nicer wave effect
  els.forEach((el, i) => {
    el.style.transitionDelay = (i % 8 * 60) + "ms";
    io.observe(el);
  });
})();

// ------------------------------------------------------------
// Card 3D tilt on pointer move (disabled on touch / reduced-motion)
// ------------------------------------------------------------
(function cardTilt() {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (reduce || coarse) return;

  const MAX = 6; // degrees

  document.querySelectorAll(".card.tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-6px) rotateX(${(-y * MAX).toFixed(2)}deg) rotateY(${(x * MAX).toFixed(2)}deg)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
})();

// ------------------------------------------------------------
// Footer year auto-update
// ------------------------------------------------------------
(function setYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();

// ============================================================
// Certifications carousel (simple, bounded, reliable)
// — arrows step one card at a time, wrapping at the ends
// — highlights the card closest to center
// — supports drag-to-scroll and wheel → horizontal
// ============================================================
(function certCarousel() {
  const gallery = document.getElementById("certGallery");
  const btnPrev = document.querySelector(".cert-arrow.left");
  const btnNext = document.querySelector(".cert-arrow.right");
  if (!gallery) return;

  const cards = Array.from(gallery.querySelectorAll(".cert-card"));
  if (!cards.length) return;

  // --- Edge padding so first/last cards can center
  function setEdgePadding() {
    const first = cards[0];
    const edge = Math.max(0, (gallery.clientWidth - first.clientWidth) / 2);
    gallery.style.setProperty("--edge", edge + "px");
  }

  // --- Center highlight
  function updateCenterHighlight() {
    const galleryRect = gallery.getBoundingClientRect();
    const center = galleryRect.left + galleryRect.width / 2;
    let best = null, bestDist = Infinity;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    cards.forEach((c) => c.classList.toggle("is-center", c === best));
    return cards.indexOf(best);
  }

  // --- Smooth scroll a card to center
  function scrollCardToCenter(card) {
    if (!card) return;
    const galleryRect = gallery.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = (cardRect.left + cardRect.width / 2) - (galleryRect.left + galleryRect.width / 2);
    gallery.scrollTo({ left: gallery.scrollLeft + delta, behavior: "smooth" });
  }

  // --- Arrow step (wraps)
  function step(dir) {
    const currentIdx = updateCenterHighlight();
    const nextIdx = (currentIdx + dir + cards.length) % cards.length;
    scrollCardToCenter(cards[nextIdx]);
  }

  // --- Drag to scroll (with click-cancel on drag)
  let dragging = false, startX = 0, startLeft = 0, moved = false;
  gallery.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startLeft = gallery.scrollLeft;
    gallery.setPointerCapture(e.pointerId);
    gallery.style.scrollSnapType = "none";
    gallery.style.cursor = "grabbing";
  });
  gallery.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    gallery.scrollLeft = startLeft - dx;
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { gallery.releasePointerCapture(e.pointerId); } catch {}
    gallery.style.scrollSnapType = "";
    gallery.style.cursor = "";
    if (moved) {
      gallery.dataset.dragging = "1";
      setTimeout(() => delete gallery.dataset.dragging, 0);
      // snap to nearest card after drag
      const idx = updateCenterHighlight();
      if (idx >= 0) scrollCardToCenter(cards[idx]);
    }
  };
  gallery.addEventListener("pointerup", endDrag);
  gallery.addEventListener("pointercancel", endDrag);
  gallery.addEventListener("click", (e) => {
    if (gallery.dataset.dragging === "1") { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // --- Wheel-to-horizontal
  gallery.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    gallery.scrollLeft += e.deltaY;
  }, { passive: false });

  // --- Update highlight as user scrolls
  let scrollRaf = null;
  gallery.addEventListener("scroll", () => {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(updateCenterHighlight);
  }, { passive: true });

  // --- Arrows
  if (btnPrev) btnPrev.addEventListener("click", () => step(-1));
  if (btnNext) btnNext.addEventListener("click", () => step(1));

  // --- Resize re-pad
  let resizeRaf = null;
  window.addEventListener("resize", () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { setEdgePadding(); updateCenterHighlight(); });
  });

  // --- Init: pad edges, center on the first card
  setEdgePadding();
  // Scroll first card into the center *without* smooth behavior, after layout settles
  requestAnimationFrame(() => {
    const first = cards[0];
    const galleryRect = gallery.getBoundingClientRect();
    const cardRect = first.getBoundingClientRect();
    gallery.scrollLeft += (cardRect.left + cardRect.width / 2) - (galleryRect.left + galleryRect.width / 2);
    updateCenterHighlight();
  });
})();
