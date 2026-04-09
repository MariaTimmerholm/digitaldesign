document.addEventListener("DOMContentLoaded", () => {
  const fadeSections = document.querySelectorAll(".fade-section");
  const horizontalSection = document.querySelector(".horizontal-section");
  const horizontalTrack = document.querySelector(".horizontal-track");
  const panels = document.querySelectorAll(".panel");
  const eras = document.querySelectorAll(".era");
  const introSection = document.querySelector(".intro-section");
  const introInner = document.querySelector(".intro-inner");

  let currentPanel = 0;
  let isAnimating = false;

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.2 });

  fadeSections.forEach(section => fadeObserver.observe(section));

  function updatePanelPosition() {
    if (!horizontalTrack) return;
    horizontalTrack.style.transform = `translateX(-${currentPanel * window.innerWidth}px)`;

    eras.forEach(era => era.classList.remove("active"));
    if (eras[currentPanel]) {
      eras[currentPanel].classList.add("active");

      document.body.classList.remove(
        "industrialism",
        "modernism",
        "postmodernism",
        "digital",
        "multimodal"
      );

      if (eras[currentPanel].classList.contains("era-1")) {
        document.body.classList.add("industrialism");
      }
      if (eras[currentPanel].classList.contains("era-2")) {
        document.body.classList.add("modernism");
      }
      if (eras[currentPanel].classList.contains("era-3")) {
        document.body.classList.add("postmodernism");
      }
      if (eras[currentPanel].classList.contains("era-4")) {
        document.body.classList.add("digital");
      }
      if (eras[currentPanel].classList.contains("era-5")) {
        document.body.classList.add("multimodal");
      }
    }
  }

  function isSectionCentered(section) {
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    return rect.top <= 0 && rect.bottom >= window.innerHeight;
  }

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;

    // Intro fade out
    if (introSection && introInner) {
      const introTop = introSection.offsetTop;
      const introHeight = introSection.offsetHeight;
      const introProgress = Math.min(
        Math.max((scrollY - introTop) / (introHeight * 0.8), 0),
        1
      );

      introInner.style.opacity = 1 - introProgress;
      introInner.style.transform = `translateY(${introProgress * 40}px)`;
    }
  });

  window.addEventListener("wheel", (e) => {
    if (!horizontalSection || !horizontalTrack || panels.length === 0) return;
    if (!isSectionCentered(horizontalSection)) return;
    if (isAnimating) {
      e.preventDefault();
      return;
    }

    const goingDown = e.deltaY > 0;
    const goingUp = e.deltaY < 0;

    // Gå till nästa panel
    if (goingDown && currentPanel < panels.length - 1) {
      e.preventDefault();
      currentPanel++;
      isAnimating = true;
      updatePanelPosition();
      setTimeout(() => {
        isAnimating = false;
      }, 750);
    }

    // Gå till föregående panel
    else if (goingUp && currentPanel > 0) {
      e.preventDefault();
      currentPanel--;
      isAnimating = true;
      updatePanelPosition();
      setTimeout(() => {
        isAnimating = false;
      }, 750);
    }

    // Om man är på sista panelen och scrollar ner -> släpp vidare
    // Om man är på första panelen och scrollar upp -> släpp tillbaka till introt
  }, { passive: false });

  window.addEventListener("resize", updatePanelPosition);

  // Intro-animation
  document.body.classList.add("loaded");

  // Sätt första panelen aktiv direkt
  updatePanelPosition();
});