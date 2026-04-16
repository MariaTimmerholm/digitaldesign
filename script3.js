document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const startOverlay = document.getElementById("startOverlay");
  const controlPanel = document.getElementById("controlPanel");

  const bgAudio = document.getElementById("bgAudio");
  const eraAudio = document.getElementById("eraAudio");

  const toggleSound = document.getElementById("toggleSound");
  const toggleAutoscroll = document.getElementById("toggleAutoscroll");

  const sections = [...document.querySelectorAll(".story-section")];

  let experienceStarted = false;
  let soundEnabled = true;
  let autoScrollEnabled = false;
  let autoScrollTimeout = null;
  let autoScrollStoppedByUser = false;
  let currentSectionIndex = 0;
  let activeEraAudioSrc = "";

  // =========================
  // START EXPERIENCE
  // =========================
  function unlockExperience() {
    experienceStarted = true;
    body.classList.remove("is-locked");
    startOverlay.classList.add("hidden");
    controlPanel.classList.remove("hidden");

    playBackgroundAudio();
    setThemeFromSection(sections[0]);
    activateSection(sections[0]);
  }

  // =========================
  // AUDIO
  // =========================
  function playBackgroundAudio() {
    if (!soundEnabled || !bgAudio) return;

    bgAudio.volume = 0.35;
    bgAudio.play().catch(() => {
      console.log("Bakgrundsljud kunde inte starta direkt.");
    });
  }

  function stopBackgroundAudio() {
    if (!bgAudio) return;
    bgAudio.pause();
  }

  function playEraAudio(src) {
    if (!soundEnabled || !src || !eraAudio) return;
    if (activeEraAudioSrc === src) return;

    activeEraAudioSrc = src;
    eraAudio.pause();
    eraAudio.src = src;
    eraAudio.currentTime = 0;
    eraAudio.volume = 0.9;

    eraAudio.play().catch(() => {
      console.log("Epokljud kunde inte spelas.");
    });
  }

  function stopEraAudio() {
    if (!eraAudio) return;

    activeEraAudioSrc = "";
    eraAudio.pause();
    eraAudio.removeAttribute("src");
    eraAudio.load();
  }

  // =========================
  // SECTION ACTIVATION
  // =========================
  function activateSection(section) {
    sections.forEach((sec) => sec.classList.remove("active-section"));
    section.classList.add("active-section");

    currentSectionIndex = sections.indexOf(section);

    setThemeFromSection(section);

    const audioSrc = section.dataset.audio || "";
    if (audioSrc) {
      playEraAudio(audioSrc);
    } else {
      stopEraAudio();
    }

    // Om autoscroll är aktiv: planera nästa hopp utifrån denna sektion
    if (autoScrollEnabled && !autoScrollStoppedByUser) {
      scheduleNextAutoScroll();
    }
  }

  function setThemeFromSection(section) {
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

    switch (era) {
      case "intro":
        body.classList.add("theme-intro");
        break;
      case "no-interaction":
        body.classList.add("theme-no-interaction");
        break;
      case "command":
        body.classList.add("theme-command");
        break;
      case "gui":
        body.classList.add("theme-gui");
        break;
      case "touch":
        body.classList.add("theme-touch");
        break;
      case "multimodal":
        body.classList.add("theme-multimodal");
        break;
      case "outro":
        body.classList.add("theme-outro");
        break;
    }
  }

  // =========================
  // INTERSECTION OBSERVER
  // =========================
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activateSection(entry.target);
        }
      });
    },
    {
      threshold: 0.6
    }
  );

  sections.forEach((section) => observer.observe(section));

  // =========================
  // AUTOSCROLL WITH CUSTOM DURATION
  // =========================
  function getSectionDuration(section) {
    const duration = parseInt(section.dataset.duration, 10);
    return Number.isNaN(duration) ? 15000 : duration;
  }

  function scheduleNextAutoScroll() {
    if (!experienceStarted || !autoScrollEnabled || autoScrollStoppedByUser) return;

    const currentSection = sections[currentSectionIndex];
    const waitTime = getSectionDuration(currentSection);

    clearTimeout(autoScrollTimeout);

    autoScrollTimeout = setTimeout(() => {
      goToNextSection();
    }, waitTime);
  }

  function goToNextSection() {
    if (!experienceStarted || !autoScrollEnabled || autoScrollStoppedByUser) return;

    const nextIndex = currentSectionIndex + 1;

    if (nextIndex >= sections.length) {
      stopAutoScroll();
      toggleAutoscroll.checked = false;
      autoScrollEnabled = false;
      return;
    }

    sections[nextIndex].scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function startAutoScroll() {
    autoScrollStoppedByUser = false;
    scheduleNextAutoScroll();
  }

  function stopAutoScroll() {
    clearTimeout(autoScrollTimeout);
    autoScrollTimeout = null;
  }

  function userInterruptedAutoScroll() {
    if (!autoScrollEnabled) return;

    autoScrollStoppedByUser = true;
    stopAutoScroll();
    toggleAutoscroll.checked = false;
    autoScrollEnabled = false;
  }

  // =========================
  // EVENT LISTENERS
  // =========================

  // Start overlay
  if (startOverlay) {
    startOverlay.addEventListener("click", unlockExperience);

    startOverlay.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        unlockExperience();
      }
    });
  }

  // Sound toggle
  if (toggleSound) {
    toggleSound.addEventListener("change", (event) => {
      soundEnabled = event.target.checked;

      if (soundEnabled) {
        playBackgroundAudio();

        const activeSection = sections[currentSectionIndex];
        if (activeSection) {
          const audioSrc = activeSection.dataset.audio || "";
          if (audioSrc) {
            playEraAudio(audioSrc);
          }
        }
      } else {
        stopBackgroundAudio();
        stopEraAudio();
      }
    });
  }

  // Autoscroll toggle
  if (toggleAutoscroll) {
    toggleAutoscroll.addEventListener("change", (event) => {
      autoScrollEnabled = event.target.checked;

      if (autoScrollEnabled) {
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    });
  }

  // Stop autoscroll if user interacts manually
  window.addEventListener(
    "wheel",
    () => {
      userInterruptedAutoScroll();
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    () => {
      userInterruptedAutoScroll();
    },
    { passive: true }
  );

  window.addEventListener("keydown", (event) => {
    const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Space", " "];
    if (keys.includes(event.code) || keys.includes(event.key)) {
      userInterruptedAutoScroll();
    }
  });
});