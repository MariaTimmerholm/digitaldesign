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
  let currentSectionIndex = 0;
  let activeEraAudioSrc = "";
  let isProgrammaticScroll = false;

  if (!sections.length) {
    console.error("Inga .story-section hittades i HTML.");
    return;
  }

  function unlockExperience() {
    experienceStarted = true;
    body.classList.remove("is-locked");

    if (startOverlay) startOverlay.classList.add("hidden");
    if (controlPanel) controlPanel.classList.remove("hidden");

    playBackgroundAudio();
    activateSection(0);
  }

  function playBackgroundAudio() {
    if (!soundEnabled || !bgAudio) return;

    bgAudio.volume = 0.35;
    bgAudio.play().catch(() => {
      console.log("Bakgrundsljud kunde inte starta.");
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

  function getSectionDuration(index) {
    const section = sections[index];
    if (!section) return 15000;

    const duration = parseInt(section.dataset.duration, 10);
    return Number.isNaN(duration) ? 15000 : duration;
  }

  function activateSection(index) {
    if (index < 0 || index >= sections.length) return;

    sections.forEach((section) => {
      section.classList.remove("active-section");
    });

    const section = sections[index];
    section.classList.add("active-section");

    currentSectionIndex = index;
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

  function getClosestSectionIndex() {
    let closestIndex = 0;
    let closestDistance = Infinity;

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const distance = Math.abs(rect.top);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  function scheduleNextScroll() {
    if (!autoScrollEnabled) return;

    clearTimeout(autoScrollTimeout);

    const waitTime = getSectionDuration(currentSectionIndex);

    autoScrollTimeout = setTimeout(() => {
      goToNextSection();
    }, waitTime);
  }

  function smoothScrollTo(targetY, duration = 2500) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * easedProgress);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function goToNextSection() {
  if (!autoScrollEnabled) return;

  const nextIndex = currentSectionIndex + 1;

  if (nextIndex >= sections.length) {
    stopAutoScroll();
    if (toggleAutoscroll) toggleAutoscroll.checked = false;
    autoScrollEnabled = false;
    return;
  }

  activateSection(nextIndex);

  isProgrammaticScroll = true;

  const targetY = sections[nextIndex].offsetTop;

  smoothScrollTo(targetY, 2000); // ändra detta värde för snabbare/långsammare scroll

  setTimeout(() => {
    isProgrammaticScroll = false;

    if (autoScrollEnabled) {
      scheduleNextScroll();
    }
  }, 3700);
  }

  function startAutoScroll() {
    clearTimeout(autoScrollTimeout);
    currentSectionIndex = getClosestSectionIndex();
    activateSection(currentSectionIndex);
    scheduleNextScroll();
  }

  function stopAutoScroll() {
    clearTimeout(autoScrollTimeout);
    autoScrollTimeout = null;
  }

  function stopAutoScrollByUser() {
    if (!autoScrollEnabled || isProgrammaticScroll) return;

    autoScrollEnabled = false;
    stopAutoScroll();

    if (toggleAutoscroll) {
      toggleAutoscroll.checked = false;
    }
  }

  function updateActiveSectionOnScroll() {
    if (isProgrammaticScroll) return;

    const index = getClosestSectionIndex();
    if (index !== currentSectionIndex) {
      activateSection(index);
    }
  }

  if (startOverlay) {
    startOverlay.addEventListener("click", unlockExperience);

    startOverlay.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        unlockExperience();
      }
    });
  }

  if (toggleSound) {
    toggleSound.addEventListener("change", (event) => {
      soundEnabled = event.target.checked;

      if (soundEnabled) {
        playBackgroundAudio();

        const activeSection = sections[currentSectionIndex];
        if (activeSection) {
          const audioSrc = activeSection.dataset.audio || "";
          if (audioSrc) playEraAudio(audioSrc);
        }
      } else {
        stopBackgroundAudio();
        stopEraAudio();
      }
    });
  }

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

  window.addEventListener("scroll", updateActiveSectionOnScroll, { passive: true });

  window.addEventListener("wheel", () => {
    stopAutoScrollByUser();
  }, { passive: true });

  window.addEventListener("touchmove", () => {
    stopAutoScrollByUser();
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Space"];
    if (keys.includes(event.key) || keys.includes(event.code)) {
      stopAutoScrollByUser();
    }
  });

  activateSection(0);
});