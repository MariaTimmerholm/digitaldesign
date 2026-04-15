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
  let autoScrollInterval = null;
  let autoScrollPausedByUser = false;
  let currentSectionIndex = 0;
  let activeEraAudioSrc = "";

  function unlockExperience() {
    experienceStarted = true;
    body.classList.remove("is-locked");
    startOverlay.classList.add("hidden");
    controlPanel.classList.remove("hidden");

    playBackgroundAudio();
    setThemeFromSection(sections[0]);
    activateSection(sections[0]);
  }

  function playBackgroundAudio() {
    if (!soundEnabled) return;

    bgAudio.volume = 0.35;
    bgAudio.play().catch(() => {
      // Browser kan blockera autoplay trots klick i vissa fall
      console.log("Bakgrundsljud kunde inte starta direkt.");
    });
  }

  function stopBackgroundAudio() {
    bgAudio.pause();
  }

  function playEraAudio(src) {
    if (!soundEnabled || !src) return;
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
    activeEraAudioSrc = "";
    eraAudio.pause();
    eraAudio.removeAttribute("src");
    eraAudio.load();
  }

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

  function scrollToNextSection() {
    if (!experienceStarted || !autoScrollEnabled || autoScrollPausedByUser) return;

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
    stopAutoScroll();

    autoScrollInterval = setInterval(() => {
      scrollToNextSection();
    }, 7000);
  }

  function stopAutoScroll() {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }

  function pauseAutoScrollTemporarily() {
    if (!autoScrollEnabled) return;

    autoScrollPausedByUser = true;

    setTimeout(() => {
      autoScrollPausedByUser = false;
    }, 6000);
  }

  // START EXPERIENCE
  startOverlay.addEventListener("click", unlockExperience);
  startOverlay.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      unlockExperience();
    }
  });

  // SOUND TOGGLE
  toggleSound.addEventListener("change", (event) => {
    soundEnabled = event.target.checked;

    if (soundEnabled) {
      playBackgroundAudio();

      const activeSection = sections[currentSectionIndex];
      const audioSrc = activeSection.dataset.audio || "";
      if (audioSrc) playEraAudio(audioSrc);
    } else {
      stopBackgroundAudio();
      stopEraAudio();
    }
  });

  // AUTO SCROLL TOGGLE
  toggleAutoscroll.addEventListener("change", (event) => {
    autoScrollEnabled = event.target.checked;

    if (autoScrollEnabled) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  });

  // Pause auto-scroll if user scrolls manually
  let lastWheelTime = 0;

  window.addEventListener("wheel", () => {
    const now = Date.now();
    if (now - lastWheelTime > 200) {
      pauseAutoScrollTemporarily();
      lastWheelTime = now;
    }
  }, { passive: true });

  window.addEventListener("touchmove", () => {
    pauseAutoScrollTemporarily();
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Space"];
    if (keys.includes(event.code) || keys.includes(event.key)) {
      pauseAutoScrollTemporarily();
    }
  });
});