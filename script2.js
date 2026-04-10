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

  function setHorizontalHeight() {
    if (!horizontalSection || panels.length === 0) return;
    horizontalSection.style.height = `${panels.length * 100}vh`;
  }

  function updateIntroFade() {
    if (!introSection || !introInner) return;

    const scrollY = window.scrollY;
    const introTop = introSection.offsetTop;
    const introHeight = introSection.offsetHeight;

    const progress = Math.min(
      Math.max((scrollY - introTop) / (introHeight * 0.8), 0),
      1
    );

    introInner.style.opacity = 1 - progress;
    introInner.style.transform = `translateY(${progress * 40}px)`;
  }

  function updateHorizontalScroll() {
    if (!horizontalSection || !horizontalTrack || panels.length === 0) return;

    const scrollY = window.scrollY;
    const sectionTop = horizontalSection.offsetTop;
    const scrollDistance = horizontalSection.offsetHeight - window.innerHeight;
    const maxTranslate = (panels.length - 1) * window.innerWidth;

    if (scrollY <= sectionTop) {
      horizontalTrack.style.transform = `translateX(0px)`;
      return;
    }

    if (scrollY >= sectionTop + scrollDistance) {
      horizontalTrack.style.transform = `translateX(-${maxTranslate}px)`;
      return;
    }

    const progress = (scrollY - sectionTop) / scrollDistance;
    const translateX = progress * maxTranslate;

    horizontalTrack.style.transform = `translateX(-${translateX}px)`;
  }

  function updateActiveEra() {
    if (!horizontalSection || panels.length === 0) return;

    const sectionTop = horizontalSection.offsetTop;
    const scrollDistance = horizontalSection.offsetHeight - window.innerHeight;
    const scrollY = window.scrollY;

    if (scrollY < sectionTop || scrollY > sectionTop + scrollDistance) return;

    const progress = (scrollY - sectionTop) / scrollDistance;
    const index = Math.round(progress * (panels.length - 1));

    eras.forEach(era => era.classList.remove("active"));

    if (eras[index]) {
      eras[index].classList.add("active");

      document.body.classList.remove(
        "industrialism",
        "modernism",
        "postmodernism",
        "digital",
        "multimodal"
      );

      if (eras[index].classList.contains("era-1")) document.body.classList.add("industrialism");
      if (eras[index].classList.contains("era-2")) document.body.classList.add("modernism");
      if (eras[index].classList.contains("era-3")) document.body.classList.add("postmodernism");
      if (eras[index].classList.contains("era-4")) document.body.classList.add("digital");
      if (eras[index].classList.contains("era-5")) document.body.classList.add("multimodal");
    }
  }

  function onScroll() {
    updateIntroFade();
    updateHorizontalScroll();
    updateActiveEra();
  }

  setHorizontalHeight();
  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", () => {
    setHorizontalHeight();
    onScroll();
  });

  document.body.classList.add("loaded");
  onScroll();
});