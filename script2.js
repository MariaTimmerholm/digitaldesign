document.addEventListener("DOMContentLoaded", () => {
  const fadeSections = document.querySelectorAll(".fade-section");
  const horizontalSection = document.querySelector(".horizontal-section");
  const horizontalTrack = document.querySelector(".horizontal-track");
  const panels = document.querySelectorAll(".panel");
  const eras = document.querySelectorAll(".era");

  const introSection = document.querySelector(".intro-section");
  const introInner = document.querySelector(".intro-inner");
  const introTitle = document.querySelector(".big-title");
  const introLines = document.querySelectorAll(".intro-lead span");
  const scrollHint = document.querySelector(".scroll-hint");

  const outroSection = document.querySelector(".outro-section");
  const outroInner = document.querySelector(".outro-inner");
  const outroTitle = document.querySelector(".outro-title");
  const outroLines = document.querySelectorAll(".outro-text span");

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.2 });

  fadeSections.forEach((section) => fadeObserver.observe(section));

  function setHorizontalHeight() {
    if (!horizontalSection || panels.length === 0) return;
    horizontalSection.style.height = `${panels.length * 140}vh`;
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

    introInner.style.opacity = 1 - progress * 0.35;
    introInner.style.transform = `translateY(${progress * 40}px)`;

    if (introTitle) {
      introTitle.style.filter = `blur(${progress * 10}px)`;
      introTitle.style.opacity = 1 - progress * 0.6;
    }

    introLines.forEach((line, index) => {
      const extraDelay = index * 0.03;
      const localProgress = Math.max(0, Math.min(1, progress + extraDelay));

      line.style.filter = `blur(${localProgress * 12}px)`;
      line.style.opacity = 1 - localProgress * 0.7;
    });

    if (scrollHint) {
      scrollHint.style.filter = `blur(${progress * 14}px)`;
      scrollHint.style.opacity = 1 - progress * 1.2;
    }
  }

  function updateHorizontalScroll() {
    if (!horizontalSection || !horizontalTrack || panels.length === 0) return;

    const scrollY = window.scrollY;
    const sectionTop = horizontalSection.offsetTop;
    const scrollDistance = horizontalSection.offsetHeight - window.innerHeight;

    const totalPanels = panels.length;
    const maxTranslate = (totalPanels - 1) * window.innerWidth;

    if (scrollY <= sectionTop) {
      horizontalTrack.style.transform = `translateX(0px)`;
      return;
    }

    if (scrollY >= sectionTop + scrollDistance) {
      horizontalTrack.style.transform = `translateX(-${maxTranslate}px)`;
      return;
    }

    const progress = (scrollY - sectionTop) / scrollDistance;
    const panelProgress = progress * (totalPanels - 1);
    const currentIndex = Math.floor(panelProgress);
    let localProgress = panelProgress - currentIndex;

    const introHold = 0.15;
    const outroHold = 0.15;

    if (localProgress < introHold) {
      localProgress = 0;
    } else if (localProgress > 1 - outroHold) {
      localProgress = 1;
    } else {
      localProgress =
        (localProgress - introHold) / (1 - introHold - outroHold);
    }

    const finalIndex = currentIndex + localProgress;
    const translateX = finalIndex * window.innerWidth;

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

    eras.forEach((era) => era.classList.remove("active"));

    if (eras[index]) {
      eras[index].classList.add("active");

      document.body.classList.remove(
        "industrialism",
        "modernism",
        "postmodernism",
        "digital",
        "multimodal"
      );

      if (eras[index].classList.contains("era-1")) {
        document.body.classList.add("industrialism");
      }
      if (eras[index].classList.contains("era-2")) {
        document.body.classList.add("modernism");
      }
      if (eras[index].classList.contains("era-3")) {
        document.body.classList.add("postmodernism");
      }
      if (eras[index].classList.contains("era-4")) {
        document.body.classList.add("digital");
      }
      if (eras[index].classList.contains("era-5")) {
        document.body.classList.add("multimodal");
      }
    }
  }

  function updateOutroBlur() {
    if (!outroSection || outroLines.length === 0) return;

    const scrollY = window.scrollY;
    const sectionTop = outroSection.offsetTop;
    const sectionHeight = outroSection.offsetHeight;

    const progress = Math.min(
      Math.max((scrollY - sectionTop) / (sectionHeight * 0.8), 0),
      1
    );

    if (outroInner) {
      outroInner.style.transform = `translateY(${progress * 20}px)`;
      outroInner.style.opacity = 1 - progress * 0.2;
    }

    if (outroTitle) {
      outroTitle.style.filter = `blur(${progress * 8}px)`;
      outroTitle.style.opacity = 1 - progress * 0.5;
    }

    outroLines.forEach((line, index) => {
      const delay = index * 0.08;
      const local = Math.min(Math.max(progress - delay, 0), 1);

      line.style.filter = `blur(${local * 14}px)`;
      line.style.opacity = 1 - local * 0.7;
    });
  }

  function onScroll() {
    updateIntroFade();
    updateHorizontalScroll();
    updateActiveEra();
    updateOutroBlur();
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