document.addEventListener("DOMContentLoaded", () => {

  const sections = document.querySelectorAll(".fade-section");
  const scrollSection = document.querySelector(".story-container");
  const crawl = document.querySelector(".crawl");
  const firstEra = document.querySelector(".era-1");

  // Fade observer
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.2 });

  sections.forEach(section => fadeObserver.observe(section));

  // TEXT FADE
  const texts = document.querySelectorAll(".story-text");

  function updateOpacity() {
    const center = window.innerHeight * 0.5;

    texts.forEach(text => {
      const rect = text.getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.height / 2) - center);

      const maxDistance = 320;
      let opacity = 1 - distance / maxDistance;

      if (distance < 35) opacity = 1;

      opacity = Math.max(opacity, 0.35);
      opacity = Math.min(opacity, 1);

      text.style.opacity = opacity;
    });
  }

  // SCROLL (ALLT i samma!)
window.addEventListener("scroll", () => {

  updateOpacity();

  const scrollY = window.scrollY;

  // ===== CRAWL =====
  if (scrollSection && crawl && firstEra) {
    const sectionTop = scrollSection.offsetTop;
    const sectionHeight = scrollSection.offsetHeight;

    if (scrollY >= sectionTop && scrollY <= sectionTop + sectionHeight) {
      const progress = (scrollY - sectionTop) / sectionHeight;

      crawl.style.transform = `
        rotateX(25deg)
        translateY(${progress * -300}px)
        translateZ(${progress * -1000}px)
      `;

      crawl.style.opacity = Math.max(1 - progress * 1.5, 0);
    }

    if (scrollY >= firstEra.offsetTop - window.innerHeight / 2) {
      crawl.style.opacity = 0;
    }
  }

  // ===== HORIZONTAL SCROLL =====
  if (section && track) {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;

    if (scrollY >= sectionTop && scrollY <= sectionTop + sectionHeight) {
      const progress = (scrollY - sectionTop) / sectionHeight;

      const maxScroll = track.scrollWidth - window.innerWidth;

      track.style.transform = `translateX(-${progress * maxScroll}px)`;
    }
  }

});
// ===== ERA STYLE SWITCH =====

const eras = document.querySelectorAll(".era");

const eraObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {

      // ta bort gamla
      eras.forEach(era => era.classList.remove("active"));

      // lägg till ny
      entry.target.classList.add("active");

      document.body.classList.remove(
        "industrialism",
        "modernism",
        "postmodernism",
        "digital"
      );

      if (entry.target.classList.contains("era-1")) {
        document.body.classList.add("industrialism");
      }
      if (entry.target.classList.contains("era-2")) {
        document.body.classList.add("modernism");
      }
      if (entry.target.classList.contains("era-3")) {
        document.body.classList.add("postmodernism");
      }
      if (entry.target.classList.contains("era-4")) {
        document.body.classList.add("digital");
      }
    }
  });
}, { threshold: 0.6 });

// VIKTIGT (utanför!)
eras.forEach(era => eraObserver.observe(era));

window.addEventListener("load", () => {
  document.body.classList.add("loaded");

  const intro = document.querySelector(".intro");

  intro.classList.add("animate");

  setTimeout(() => {
    intro.style.display = "none";
    document.body.classList.add("show-title");
  }, 1500);
});
