// script.js
document.addEventListener("DOMContentLoaded", () => {
  const rail = document.getElementById("contactScroll");
  const leftBtn = document.querySelector(".rail-left");
  const rightBtn = document.querySelector(".rail-right");
  const leftFade = document.querySelector(".rail-fade-left");
  const rightFade = document.querySelector(".rail-fade-right");

  function cardWidth() {
    const card = rail.querySelector(".contact-card");
    if (!card) return 300;
    const style = getComputedStyle(rail);
    const gap = parseFloat(style.columnGap || style.gap || 16);
    return card.getBoundingClientRect().width + gap;
  }

  // Enable horizontal scrolling with mouse wheel
  rail.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        rail.scrollLeft += e.deltaY;
      }
    },
    { passive: false }
  );

  // Arrow navigation
  leftBtn.addEventListener("click", () => {
    rail.scrollBy({ left: -cardWidth(), behavior: "smooth" });
  });
  rightBtn.addEventListener("click", () => {
    rail.scrollBy({ left: cardWidth(), behavior: "smooth" });
  });

  // Fade edges based on scroll position
  function updateFades() {
    const max = rail.scrollWidth - rail.clientWidth - 1;
    leftFade.style.opacity = rail.scrollLeft > 2 ? 1 : 0;
    rightFade.style.opacity = rail.scrollLeft < max ? 1 : 0;
  }

  rail.addEventListener("scroll", updateFades);
  window.addEventListener("resize", updateFades);

  // Initial check
  updateFades();
});
