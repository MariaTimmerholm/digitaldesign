document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const clamp = (value, min = 0, max = 1) =>
    Math.min(Math.max(value, min), max);

  const startOverlay = $("#startOverlay");
  const controlPanel = $("#controlPanel");
  const bgAudio = $("#bgAudio");
  const eraAudio = $("#eraAudio");
  const toggleSound = $("#toggleSound");
  const toggleAutoscroll = $("#toggleAutoscroll");

  const sections = $$(".story-section");

  let experienceStarted = false;
  let soundEnabled = true;
  let autoScrollEnabled = false;
  let autoScrollStoppedByUser = false;
  let currentSectionIndex = 0;
  let activeEraAudioSrc = "";

  let autoScrollTimeout = null;
  let autoScrollFrame = null;
  let introRideFrame = null;
  let sectionScrollTimeout = null;

  const BG_NORMAL_VOLUME = 0.35;
  const BG_LOW_VOLUME = 0.12;
  const ERA_VOLUME = 0.9;

  /* =========================
     AUDIO
  ========================= */

  function fadeVolume(audio, targetVolume, duration = 500) {
    if (!audio) return;

    const startVolume = audio.volume;
    const startTime = performance.now();

    function step(now) {
      const progress = clamp((now - startTime) / duration);
      audio.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function playBackgroundAudio() {
    if (!soundEnabled || !bgAudio) return;

    bgAudio.volume = BG_NORMAL_VOLUME;
    bgAudio.play().catch(() => {
      console.log("Bakgrundsljud kunde inte starta.");
    });
  }

  function stopBackgroundAudio() {
    if (bgAudio) bgAudio.pause();
  }

  function lowerBackgroundAudio() {
    fadeVolume(bgAudio, BG_LOW_VOLUME, 400);
  }

  function restoreBackgroundAudio() {
    fadeVolume(bgAudio, BG_NORMAL_VOLUME, 700);
  }

  function playEraAudio(src) {
    if (!soundEnabled || !src || !eraAudio) return;
    if (activeEraAudioSrc === src) return;

    activeEraAudioSrc = src;

    eraAudio.pause();
    eraAudio.src = src;
    eraAudio.currentTime = 0;
    eraAudio.volume = ERA_VOLUME;

    lowerBackgroundAudio();

    eraAudio.play().catch(() => {
      console.log("Epokljud kunde inte spelas.");
      restoreBackgroundAudio();
    });
  }

  function stopEraAudio() {
    if (!eraAudio) return;

    activeEraAudioSrc = "";
    eraAudio.pause();
    eraAudio.removeAttribute("src");
    eraAudio.load();

    restoreBackgroundAudio();
  }

  if (eraAudio) {
    eraAudio.addEventListener("ended", () => {
      activeEraAudioSrc = "";
      restoreBackgroundAudio();
    });
  }

  /* =========================
     START
  ========================= */

  function unlockExperience({ skipInitialActivation = false } = {}) {
    experienceStarted = true;

    body.classList.remove("is-locked");
    startOverlay?.classList.add("hidden");
    controlPanel?.classList.remove("hidden");

    playBackgroundAudio();

    if (!skipInitialActivation && sections.length) {
      activateSection(sections[0]);
    }
  }

  /* =========================
     SECTION THEME + AUDIO
  ========================= */

  function setThemeFromSection(section) {
    if (!section) return;

    body.classList.remove(
      "theme-intro",
      "theme-no-interaction",
      "theme-command",
      "theme-gui",
      "theme-touch",
      "theme-multimodal",
      "theme-outro"
    );

    const era = section.dataset.era;
    if (era) body.classList.add(`theme-${era}`);
  }

  function activateSection(section) {
    if (!section) return;

    sections.forEach((sec) => sec.classList.remove("active-section"));
    section.classList.add("active-section");

    currentSectionIndex = sections.indexOf(section);
    setThemeFromSection(section);

    const audioSrc = section.dataset.audio || "";
    audioSrc ? playEraAudio(audioSrc) : stopEraAudio();

    if (autoScrollEnabled && !autoScrollStoppedByUser) {
      scheduleNextAutoScroll();
    }
  }

  function observeActiveItems(items, activeClass, pastClass, threshold = 0.4) {
    if (!items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          items.forEach((item) => item.classList.remove(activeClass, pastClass));
          entry.target.classList.add(activeClass);

          const activeIndex = items.indexOf(entry.target);

          items.forEach((item, index) => {
            item.classList.toggle(pastClass, index < activeIndex);
          });
        });
      },
      { threshold }
    );

    items.forEach((item) => observer.observe(item));
  }

  if (sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) activateSection(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  observeActiveItems($$(".era-1 .artifact-panel"), "panel-active", "panel-past", 0.15);
  observeActiveItems($$(".command-era .command-panel"), "command-active", "command-past", 0.35);
  observeActiveItems($$(".gui-era .gui-window"), "gui-active", "gui-past", 0.45);

  /* =========================
     AUTOSCROLL
  ========================= */

  function stopAnimation(frame) {
    if (frame) cancelAnimationFrame(frame);
  }

  function stopSectionMicroScroll() {
    stopAnimation(autoScrollFrame);
    autoScrollFrame = null;

    clearTimeout(sectionScrollTimeout);
    sectionScrollTimeout = null;
  }

  function stopIntroRide() {
    stopAnimation(introRideFrame);
    introRideFrame = null;
  }

  function getSectionDuration(section) {
    const duration = parseInt(section?.dataset.duration, 10);
    return Number.isNaN(duration) ? 15000 : duration;
  }

  function getFirstStorySection() {
    return sections.find((section) => section.dataset.era !== "intro") || sections[0];
  }

  function getAutoScrollTargetSection() {
    if (!experienceStarted) return getFirstStorySection();

    const currentSection = sections[currentSectionIndex];

    if (!currentSection || currentSection.dataset.era === "intro") {
      return getFirstStorySection();
    }

    return sections[currentSectionIndex + 1] || currentSection;
  }

  function easeInOut(t) {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function startSectionMicroScroll(section, totalDuration) {
    if (!section || !autoScrollEnabled || autoScrollStoppedByUser) return;

    stopSectionMicroScroll();

    const sectionTop = section.offsetTop;
    const maxOffset = Math.max(0, section.offsetHeight - window.innerHeight);
    const maxTargetY = sectionTop + maxOffset;

    const startY = Math.max(window.scrollY, sectionTop);
    const targetY = Math.min(startY + 220, maxTargetY);
    const distance = targetY - startY;

    if (distance <= 0) return;

    const scrollDuration = totalDuration * 0.8;
    const startTime = performance.now();

    function step(now) {
      if (!autoScrollEnabled || autoScrollStoppedByUser) return;

      const progress = clamp((now - startTime) / scrollDuration);
      window.scrollTo(0, startY + distance * easeInOut(progress));

      if (progress < 1) {
        autoScrollFrame = requestAnimationFrame(step);
      } else {
        autoScrollFrame = null;
      }
    }

    sectionScrollTimeout = setTimeout(() => {
      autoScrollFrame = requestAnimationFrame(step);
    }, 300);
  }

  function startRideToSection(targetSection) {
    return new Promise((resolve) => {
      if (!targetSection) return resolve();

      stopIntroRide();

      const startY = window.scrollY;
      const targetY = targetSection.offsetTop;
      const distance = targetY - startY;
      const wobbleAmount = Math.min(30, Math.abs(distance) * 0.08);
      const duration = 1800;
      const startTime = performance.now();

      function step(now) {
        if (!autoScrollEnabled || autoScrollStoppedByUser) {
          stopIntroRide();
          return resolve();
        }

        const progress = clamp((now - startTime) / duration);
        const eased = easeOutCubic(progress);
        const wobble =
          Math.sin(progress * Math.PI * 3) *
          wobbleAmount *
          (1 - progress);

        window.scrollTo(0, startY + distance * eased + wobble);

        if (progress < 1) {
          introRideFrame = requestAnimationFrame(step);
        } else {
          window.scrollTo(0, targetY);
          introRideFrame = null;
          resolve();
        }
      }

      introRideFrame = requestAnimationFrame(step);
    });
  }

  function scheduleNextAutoScroll() {
    if (!experienceStarted || !autoScrollEnabled || autoScrollStoppedByUser) return;

    const currentSection = sections[currentSectionIndex];
    if (!currentSection) return;

    const waitTime = getSectionDuration(currentSection);

    clearTimeout(autoScrollTimeout);
    stopSectionMicroScroll();

    startSectionMicroScroll(currentSection, waitTime);

    autoScrollTimeout = setTimeout(goToNextSection, waitTime);
  }

  async function startAutoScroll() {
    autoScrollStoppedByUser = false;

    if (!experienceStarted) {
      unlockExperience({ skipInitialActivation: true });
    }

    const targetSection = getAutoScrollTargetSection();
    if (!targetSection) return;

    await startRideToSection(targetSection);

    if (!autoScrollEnabled || autoScrollStoppedByUser) return;

    activateSection(targetSection);
    scheduleNextAutoScroll();
  }

  function stopAutoScroll() {
    clearTimeout(autoScrollTimeout);
    autoScrollTimeout = null;

    stopSectionMicroScroll();
    stopIntroRide();
  }

  function goToNextSection() {
    if (!experienceStarted || !autoScrollEnabled || autoScrollStoppedByUser) return;

    stopSectionMicroScroll();

    const nextSection = sections[currentSectionIndex + 1];

    if (!nextSection) {
      autoScrollEnabled = false;
      toggleAutoscroll && (toggleAutoscroll.checked = false);
      stopAutoScroll();
      return;
    }

    nextSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function userInterruptedAutoScroll() {
    if (!autoScrollEnabled) return;

    autoScrollStoppedByUser = true;
    autoScrollEnabled = false;

    toggleAutoscroll && (toggleAutoscroll.checked = false);
    stopAutoScroll();
  }

  /* =========================
     SCROLL EFFECTS
  ========================= */

  const unixNode = document.querySelector(".unix-node");
  const codeRain = document.querySelector(".unix-node .code-rain");
  const eniacPanel = $(".artifact-eniac");
  const messagePanel = $(".message-panel");
  const eraTransition = $(".command-to-gui");
  const touchScene = $(".phone-scroll-scene");
  const touchPanels = $$(".touch-era .phone-panel");

  const outroSection = $(".outro-section");
  const outroInner = $(".outro-inner");
  const outroTitle = $(".outro-title");
  const outroLines = $$(".outro-text span");

  const typeSend = $(".type-send");
  const typeLo = $(".type-lo");

  function updateUnixLines() {
    if (!unixNode || !codeRain) return;

    const rect = unixNode.getBoundingClientRect();
    const scrollDistance = unixNode.offsetHeight - window.innerHeight;

    const progress = clamp(
      -rect.top / scrollDistance,
      0,
      1
    );

    codeRain.style.setProperty("--unix-scroll", progress);
    codeRain.style.setProperty("--unix-progress", `${progress * 100}%`);
  }

  function updateEniacCurtains() {
    if (!eniacPanel) return;

    const start = eniacPanel.offsetTop;
    const end = start + eniacPanel.offsetHeight - window.innerHeight;

    if (end <= start) return;

    const progress = clamp((window.scrollY - start) / (end - start));
    const curtainOpen = clamp(progress / 0.45) * 100;

    eniacPanel.style.setProperty("--curtain-open", curtainOpen);
  }

  function updateMessageTyping() {
    if (!messagePanel || !typeSend || !typeLo) return;

    const start = messagePanel.offsetTop;
    const end = start + messagePanel.offsetHeight - window.innerHeight;

    const progress = clamp((window.scrollY - start) / (end - start));

    const sendText = " send message";
    const loText = "LO";

    const sendCount = Math.floor(clamp(progress / 0.55) * sendText.length);
    const loCount = Math.floor(clamp((progress - 0.6) / 0.25) * loText.length);

    typeSend.textContent = sendText.slice(0, sendCount);
    typeLo.textContent = loText.slice(0, loCount);
  }

  function updateEraTransition() {
    if (!eraTransition) return;

    const rect = eraTransition.getBoundingClientRect();
    const progress = clamp(
      (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
    );

    eraTransition.classList.toggle("transition-gui", progress > 0.45);
  }

  function updateTouchPanels() {
    if (!touchScene || !touchPanels.length) return;

    const rect = touchScene.getBoundingClientRect();
    const scrollableDistance = touchScene.offsetHeight - window.innerHeight;

    const progress = clamp(-rect.top / scrollableDistance);

    const activeIndex = Math.min(
      touchPanels.length - 1,
      Math.floor(progress * touchPanels.length)
    );

    touchPanels.forEach((panel, index) => {
      panel.classList.toggle("touch-active", index === activeIndex);
      panel.classList.toggle("touch-past", index < activeIndex);
    });
  }

  function updateOutroBlur() {
    if (!outroSection || !outroLines.length) return;

    const sectionTop = outroSection.offsetTop;
    const scrollDistance = outroSection.offsetHeight - window.innerHeight;
    const progress = clamp((window.scrollY - sectionTop) / scrollDistance);

    const introHold = 0.25;
    const blurEnd = 0.9;
    const blurProgress =
      progress <= introHold
        ? 0
        : clamp((progress - introHold) / (blurEnd - introHold));

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
      const local = clamp(blurProgress - delay);

      line.style.filter = `blur(${local * 28}px)`;
      line.style.opacity = 1 - local * 0.7;
    });
  }

  function onScroll() {
    updateUnixLines();
    updateEniacCurtains();
    updateMessageTyping();
    updateEraTransition();
    updateTouchPanels();
    updateOutroBlur();
  }

  /* =========================
     ARTIFACT AUDIO
  ========================= */

  const artifactAudio = new Audio();
  artifactAudio.volume = 0;

  let activeArtifactAudioSrc = "";
  let artifactFadeFrame = null;

  function fadeArtifactAudio(targetVolume, duration = 600) {
    if (artifactFadeFrame) cancelAnimationFrame(artifactFadeFrame);

    const startVolume = artifactAudio.volume;
    const startTime = performance.now();

    function step(now) {
      const progress = clamp((now - startTime) / duration);
      artifactAudio.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress < 1) {
        artifactFadeFrame = requestAnimationFrame(step);
      } else if (targetVolume === 0) {
        artifactAudio.pause();
        artifactAudio.removeAttribute("src");
        artifactAudio.load();
        activeArtifactAudioSrc = "";
      }
    }

    artifactFadeFrame = requestAnimationFrame(step);
  }

  function playArtifactAudio(src) {
    if (!soundEnabled || !src || activeArtifactAudioSrc === src) return;

    if (artifactFadeFrame) cancelAnimationFrame(artifactFadeFrame);

    activeArtifactAudioSrc = src;
    artifactAudio.pause();
    artifactAudio.src = src;
    artifactAudio.currentTime = 0;
    artifactAudio.volume = 0;

    artifactAudio.play()
      .then(() => fadeArtifactAudio(0.9, 700))
      .catch(() => console.log("Artefaktljud kunde inte spelas."));
  }

  function stopArtifactAudio() {
    if (activeArtifactAudioSrc) fadeArtifactAudio(0, 500);
  }

  const audioArtifacts = $$("[data-audio]")
    .filter((el) => !el.classList.contains("story-section"));

  if (audioArtifacts.length) {
    const artifactAudioObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const src = entry.target.dataset.audio;

          if (entry.isIntersecting) {
            playArtifactAudio(src);
          } else if (activeArtifactAudioSrc === src) {
            stopArtifactAudio();
          }
        });
      },
      { threshold: 0.55 }
    );

    audioArtifacts.forEach((artifact) => artifactAudioObserver.observe(artifact));
  }

  /* =========================
     EVENTS
  ========================= */

  startOverlay?.addEventListener("click", () => unlockExperience());

  startOverlay?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      unlockExperience();
    }
  });

  toggleAutoscroll?.addEventListener("change", async (event) => {
    autoScrollEnabled = event.target.checked;

    if (autoScrollEnabled) {
      await startAutoScroll();
    } else {
      stopAutoScroll();
    }
  });

  toggleSound?.addEventListener("change", (event) => {
    soundEnabled = event.target.checked;

    if (soundEnabled) {
      playBackgroundAudio();

      const activeSection = sections[currentSectionIndex];
      const audioSrc = activeSection?.dataset.audio || "";

      if (audioSrc) playEraAudio(audioSrc);
    } else {
      stopBackgroundAudio();
      stopEraAudio();
      stopArtifactAudio();
    }
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  window.addEventListener("wheel", userInterruptedAutoScroll, { passive: true });
  window.addEventListener("touchmove", userInterruptedAutoScroll, { passive: true });

  window.addEventListener("keydown", (event) => {
    const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Space", " "];

    if (keys.includes(event.code) || keys.includes(event.key)) {
      userInterruptedAutoScroll();
    }
  });

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  onScroll();
});