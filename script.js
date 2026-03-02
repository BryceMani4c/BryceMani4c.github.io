// ============================================
// Load at top instantly (no visible scroll-up)
// ============================================
(function () {
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch {}

  const root = document.documentElement;

  // If your CSS has `scroll-behavior: smooth`, a programmatic scroll can animate.
  // Force "auto" just long enough to jump to top, then restore immediately.
  const prevInline = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);

  // Restore after first frame so normal smooth anchor navigation still works.
  requestAnimationFrame(() => {
    root.style.scrollBehavior = prevInline;
  });
})();

// ============================================
// Certifications Carousel (Smooth + Drag + Momentum)
// ============================================
(function () {
  const gallery = document.getElementById("certGallery");
  const btnPrev = document.querySelector(".cert-arrow.left");
  const btnNext = document.querySelector(".cert-arrow.right");

  if (!gallery) return;

  // ---------- Utilities ----------
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function getGapPx() {
    const style = getComputedStyle(gallery);
    const gap = parseFloat(style.gap || style.columnGap || "0");
    return Number.isFinite(gap) ? gap : 0;
  }

  function getCards() {
    return Array.from(gallery.querySelectorAll(".cert-card"));
  }

  function getCenterX() {
    const r = gallery.getBoundingClientRect();
    return r.left + r.width / 2;
  }

  function cardCenterX(cardEl) {
    const r = cardEl.getBoundingClientRect();
    return r.left + r.width / 2;
  }

  function setEdgePadding() {
    const card = gallery.querySelector(".cert-card");
    if (!card) return;
    const edge = Math.max(0, (gallery.clientWidth - card.clientWidth) / 2);
    gallery.style.setProperty("--edge", `${edge}px`);
  }

  function instantScrollToCard(cardEl) {
    if (!cardEl) return;
    cardEl.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
  }

  // rAF eased scroll for consistent "smoothness" on arrow clicks
  let scrollAnim = null;
  function animateScrollLeftTo(targetLeft, durationMs = 360) {
    if (scrollAnim) cancelAnimationFrame(scrollAnim);

    const startLeft = gallery.scrollLeft;
    const delta = targetLeft - startLeft;
    const start = performance.now();

    const step = (now) => {
      const t = clamp((now - start) / durationMs, 0, 1);
      gallery.scrollLeft = startLeft + delta * easeOutCubic(t);
      if (t < 1) scrollAnim = requestAnimationFrame(step);
    };

    scrollAnim = requestAnimationFrame(step);
  }

  // Find the card closest to the visual center
  function closestToCenter() {
    const center = getCenterX();
    let best = null;
    let bestD = Infinity;

    for (const c of getCards()) {
      const d = Math.abs(cardCenterX(c) - center);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  // Compute target scrollLeft to center a given card
  function targetScrollLeftForCard(cardEl) {
    const galleryRect = gallery.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();

    const galleryCenter = galleryRect.left + galleryRect.width / 2;
    const cardCenter = cardRect.left + cardRect.width / 2;

    // If cardCenter is to the right, increase scrollLeft, etc.
    const deltaPx = cardCenter - galleryCenter;
    return gallery.scrollLeft + deltaPx;
  }

  // ---------- Infinite loop clones ----------
  let originals = Array.from(gallery.children);

  function cloneSet(where) {
    const frag = document.createDocumentFragment();
    originals.forEach((el, idx) => {
      const c = el.cloneNode(true);
      c.dataset.clone = where;
      c.dataset.id = String(idx);
      frag.appendChild(c);
    });
    return frag;
  }

  function setupLoop() {
    // Mark originals as middle
    originals.forEach((el, idx) => {
      el.dataset.clone = "mid";
      el.dataset.id = String(idx);
    });

    // Clone before and after
    gallery.prepend(cloneSet("pre"));
    gallery.append(cloneSet("post"));

    // Jump to the first "mid" card centered
    const firstMid = Array.from(gallery.children).find((el) => el.dataset.clone === "mid");
    instantScrollToCard(firstMid);
  }

  // If we end up centered on a clone, instantly normalize to the corresponding mid card
  function normalizeCloneIfNeeded(centerCard) {
    if (!centerCard) return;

    const cloneType = centerCard.dataset.clone;
    if (cloneType !== "pre" && cloneType !== "post") return;

    const id = centerCard.dataset.id;
    const midMatch = Array.from(gallery.children).find(
      (n) => n.dataset.clone === "mid" && n.dataset.id === id
    );

    if (midMatch) {
      instantScrollToCard(midMatch);
    }
  }

  // ---------- Center highlighting via IntersectionObserver ----------
  // More efficient than doing bounding math on every scroll tick. :contentReference[oaicite:4]{index=4}
  let io = null;
  function setupCenterObserver() {
    if (io) io.disconnect();

    const candidates = getCards();
    if (!candidates.length) return;

    io = new IntersectionObserver(
      (entries) => {
        // Choose the entry with the highest intersection ratio as "center-ish"
        let best = null;

        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }

        // If nothing intersecting strongly, fall back to closest-to-center
        const chosen = best ? best.target : closestToCenter();

        // Update class
        gallery.querySelectorAll(".cert-card.is-center").forEach((el) => el.classList.remove("is-center"));
        if (chosen) chosen.classList.add("is-center");

        // Normalize clones smoothly (instant jump, but should be unnoticeable)
        normalizeCloneIfNeeded(chosen);
      },
      {
        root: gallery,
        // A tight band helps "center" selection feel stable.
        // Negative margins reduce the effective viewport to its center band.
        rootMargin: "0px -35% 0px -35%",
        threshold: [0.35, 0.5, 0.65, 0.8, 0.95],
      }
    );

    for (const c of candidates) io.observe(c);
  }

  // ---------- Arrow navigation (centered-step) ----------
  function nudge(dir) {
    const cards = getCards();
    if (!cards.length) return;

    const current = closestToCenter();
    if (!current) return;

    const idx = cards.indexOf(current);
    const nextIdx = clamp(idx + dir, 0, cards.length - 1);
    const next = cards[nextIdx];

    const targetLeft = targetScrollLeftForCard(next);
    animateScrollLeftTo(targetLeft, 360);

    // Normalize + center class will be handled by IntersectionObserver.
  }

  // ---------- Wheel-to-horizontal ----------
  function onWheel(e) {
    // Turn vertical wheel into horizontal scroll.
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    gallery.scrollLeft += e.deltaY;
  }

  // ---------- Drag with momentum ----------
  // Common pattern for momentum: track velocity while dragging then decay. :contentReference[oaicite:5]{index=5}
  let dragging = false;
  let dragStartX = 0;
  let dragStartLeft = 0;

  let lastMoveX = 0;
  let lastMoveT = 0;
  let velocity = 0; // px/ms

  let momentumRaf = null;
  let didDrag = false;

  function stopMomentum() {
    if (momentumRaf) cancelAnimationFrame(momentumRaf);
    momentumRaf = null;
  }

  function startMomentum() {
    stopMomentum();

    const friction = 0.92; // closer to 1 = longer glide
    const minVel = 0.02;   // px/ms cutoff

    const tick = () => {
      // Apply velocity
      gallery.scrollLeft -= velocity * 16; // approx per-frame step @60fps
      velocity *= friction;

      if (Math.abs(velocity) < minVel) {
        momentumRaf = null;

        // After momentum stops, softly center the nearest card for a "finished" feel
        const center = closestToCenter();
        if (center) {
          const targetLeft = targetScrollLeftForCard(center);
          animateScrollLeftTo(targetLeft, 220);
        }
        return;
      }

      momentumRaf = requestAnimationFrame(tick);
    };

    momentumRaf = requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    // Only primary button for mouse, but allow touch.
    if (e.pointerType === "mouse" && e.button !== 0) return;

    stopMomentum();
    dragging = true;
    didDrag = false;

    gallery.setPointerCapture(e.pointerId);

    dragStartX = e.clientX;
    dragStartLeft = gallery.scrollLeft;

    lastMoveX = e.clientX;
    lastMoveT = performance.now();
    velocity = 0;

    // Improve feel while dragging
    gallery.style.scrollSnapType = "none";
    gallery.style.cursor = "grabbing";
  }

  function onPointerMove(e) {
    if (!dragging) return;

    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 4) didDrag = true;

    gallery.scrollLeft = dragStartLeft - dx;

    const now = performance.now();
    const dt = now - lastMoveT;

    if (dt > 0) {
      const vx = (e.clientX - lastMoveX) / dt; // px/ms
      // invert because scrollLeft moves opposite of pointer drag direction
      velocity = vx;
      lastMoveX = e.clientX;
      lastMoveT = now;
    }
  }

  function onPointerUp(e) {
    if (!dragging) return;

    dragging = false;
    gallery.releasePointerCapture(e.pointerId);

    gallery.style.scrollSnapType = "";
    gallery.style.cursor = "";

    // Prevent accidental clicks after a drag
    if (didDrag) {
      // Small timeout lets pointerup finish before click fires
      gallery.dataset.dragging = "1";
      setTimeout(() => delete gallery.dataset.dragging, 0);
    }

    // Momentum uses velocity; invert sign to match scroll direction
    // If user drags right, vx positive, scrollLeft decreased; we want glide consistent:
    velocity = clamp(velocity, -2, 2);

    if (Math.abs(velocity) > 0.05) startMomentum();
    else {
      const center = closestToCenter();
      if (center) {
        const targetLeft = targetScrollLeftForCard(center);
        animateScrollLeftTo(targetLeft, 220);
      }
    }
  }

  // Cancel link clicks if the user dragged
  function onClickCapture(e) {
    if (gallery.dataset.dragging === "1") {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ---------- Init ----------
  setEdgePadding();
  setupLoop();
  setupCenterObserver();

  gallery.addEventListener("wheel", onWheel, { passive: false });
  gallery.addEventListener("pointerdown", onPointerDown);
  gallery.addEventListener("pointermove", onPointerMove);
  gallery.addEventListener("pointerup", onPointerUp);
  gallery.addEventListener("pointercancel", onPointerUp);
  gallery.addEventListener("click", onClickCapture, true);

  window.addEventListener("resize", () => {
    setEdgePadding();
    setupCenterObserver();
  });

  if (btnPrev) btnPrev.addEventListener("click", () => nudge(-1));
  if (btnNext) btnNext.addEventListener("click", () => nudge(1));
})();