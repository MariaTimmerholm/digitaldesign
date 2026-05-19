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

    function updateActiveEra() {
    let activeIndex = 0;

    eras.forEach((era, index) => {
        const rect = era.getBoundingClientRect();

        if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.5) {
        activeIndex = index;
        }
    });

    eras.forEach((era) => era.classList.remove("active"));

    if (eras[activeIndex]) {
        eras[activeIndex].classList.add("active");

        document.body.classList.remove(
        "industrialism",
        "modernism",
        "postmodernism",
        "digital",
        "multimodal"
        );

        if (eras[activeIndex].classList.contains("era-1")) {
        document.body.classList.add("industrialism");
        }

        if (eras[activeIndex].classList.contains("era-2")) {
        document.body.classList.add("modernism");
        }

        if (eras[activeIndex].classList.contains("era-3")) {
        document.body.classList.add("postmodernism");
        }

        if (eras[activeIndex].classList.contains("era-4")) {
        document.body.classList.add("digital");
        }

        if (eras[activeIndex].classList.contains("era-5")) {
        document.body.classList.add("multimodal");
        }
    }
    }

  function updateOutroBlur() {
    if (!outroSection || !outroLines.length) return;

    const scrollY = window.scrollY;
    const sectionTop = outroSection.offsetTop;
    const scrollDistance = outroSection.offsetHeight - window.innerHeight;

    if (scrollY <= sectionTop) {
      if (outroInner) {
        outroInner.style.opacity = 1;
        outroInner.style.transform = `translateY(0px)`;
      }

      if (outroTitle) {
        outroTitle.style.filter = `blur(0px)`;
        outroTitle.style.opacity = 1;
      }

      outroLines.forEach((line) => {
        line.style.filter = `blur(0px)`;
        line.style.opacity = 1;
      });

      return;
    }

    if (scrollY >= sectionTop + scrollDistance) {
      if (outroInner) {
        outroInner.style.opacity = 0;
        outroInner.style.transform = `translateY(30px)`;
      }

      if (outroTitle) {
        outroTitle.style.filter = `blur(24px)`;
        outroTitle.style.opacity = 0;
      }

      outroLines.forEach((line) => {
        line.style.filter = `blur(28px)`;
        line.style.opacity = 0;
      });

      return;
    }

    let progress = (scrollY - sectionTop) / scrollDistance;

    const introHold = 0.25;
    const blurEnd = 0.9;

    if (progress <= introHold) {
      if (outroInner) {
        outroInner.style.opacity = 1;
        outroInner.style.transform = `translateY(0px)`;
      }

      if (outroTitle) {
        outroTitle.style.filter = `blur(0px)`;
        outroTitle.style.opacity = 1;
      }

      outroLines.forEach((line) => {
        line.style.filter = `blur(0px)`;
        line.style.opacity = 1;
      });

      return;
    }

    let blurProgress = (progress - introHold) / (blurEnd - introHold);
    blurProgress = Math.max(0, Math.min(1, blurProgress));

    if (outroInner) {
      outroInner.style.opacity = 1 - blurProgress * 0.3;
      outroInner.style.transform = `translateY(${blurProgress * 30}px)`;
    }

    if (outroTitle) {
      outroTitle.style.filter = `blur(${blurProgress * 24}px)`;
      outroTitle.style.opacity = 1 - blurProgress;
    }

    outroLines.forEach((line, index) => {
      const delay = index * 0.06;
      const local = Math.max(0, Math.min(1, blurProgress - delay));

      line.style.filter = `blur(${local * 28}px)`;
      line.style.opacity = 1 - local * 0.7;
    });
  }

    function onScroll() {
    updateIntroFade();
    updateActiveEra();
    updateOutroBlur();
    }

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  window.addEventListener("resize", onScroll);

  window.scrollTo(0, 0);
  document.body.classList.add("loaded");

  const intro = document.querySelector(".intro");
  if (intro) {
    intro.classList.add("animate");

    setTimeout(() => {
      intro.style.display = "none";
      document.body.classList.add("show-title");
    }, 1500);
  }
});