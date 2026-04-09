document.addEventListener("DOMContentLoaded", () => {
  const fadeSections = document.querySelectorAll(".fade-section");
  const horizontalSection = document.querySelector(".horizontal-section");
  const horizontalTrack = document.querySelector(".horizontal-track");
  const panels = document.querySelectorAll(".panel");
  const eras = document.querySelectorAll(".era");
  const introSection = document.querySelector(".intro-section");
  const introInner = document.querySelector(".intro-inner");

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.2 });

  fadeSections.forEach(section => fadeObserver.observe(section));

  if (horizontalSection && panels.length > 0) {
    horizontalSection.style.height = `${panels.length * 100}vh`;
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

    // Horisontell scroll
    if (horizontalSection && horizontalTrack) {
      const sectionTop = horizontalSection.offsetTop;
      const sectionHeight = horizontalSection.offsetHeight - window.innerHeight;

      if (scrollY >= sectionTop && scrollY <= sectionTop + sectionHeight) {
        const progress = (scrollY - sectionTop) / sectionHeight;
        const maxScroll = horizontalTrack.scrollWidth - window.innerWidth;

        horizontalTrack.style.transform = `translateX(-${progress * maxScroll}px)`;
      }
    }
  });

  const eraObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        eras.forEach(era => era.classList.remove("active"));
        entry.target.classList.add("active");

        document.body.classList.remove(
          "industrialism",
          "modernism",
          "postmodernism",
          "digital",
          "multimodal"
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
        if (entry.target.classList.contains("era-5")) {
          document.body.classList.add("multimodal");
        }
      }
    });
  }, { threshold: 0.6 });

  eras.forEach(era => eraObserver.observe(era));

  document.body.classList.add("loaded");
  document.body.classList.add("show-title");
});