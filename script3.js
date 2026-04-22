document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const startOverlay = document.getElementById("startOverlay");
  const controlPanel = document.getElementById("controlPanel");

  const bgAudio = document.getElementById("bgAudio");
  const eraAudio = document.getElementById("eraAudio");

  const toggleSound = document.getElementById("toggleSound");
  const toggleAutoscroll = document.getElementById("toggleAutoscroll");

  const sections = [...document.querySelectorAll(".story-section")];

  let introRideAnimationFrame = null;
  let experienceStarted = false;
  let soundEnabled = true;
  let autoScrollEnabled = false;
  let autoScrollTimeout = null;
  let autoScrollStoppedByUser = false;
  let currentSectionIndex = 0;
  let activeEraAudioSrc = "";
  let autoScrollAnimationFrame = null;
  let sectionScrollTimeout = null;

  const BG_NORMAL_VOLUME = 0.35;
  const BG_LOW_VOLUME = 0.12;
  const ERA_VOLUME = 0.9;

  // =========================
  // START EXPERIENCE
  // =========================
  function unlockExperience() {
    experienceStarted = true;
    body.classList.remove("is-locked");

    if (startOverlay) {
      startOverlay.classList.add("hidden");
    }

    if (controlPanel) {
      controlPanel.classList.remove("hidden");
    }

    playBackgroundAudio();

    if (sections.length > 0) {
      setThemeFromSection(sections[0]);
      activateSection(sections[0]);
    }
  }

  // =========================
  // AUDIO HELPERS
  // =========================
  function fadeVolume(audio, targetVolume, duration = 500) {
    if (!audio) return;

    const startVolume = audio.volume;
    const volumeChange = targetVolume - startVolume;
    const startTime = performance.now();

    function step(currentTime) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      audio.volume = startVolume + volumeChange * progress;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function lowerBackgroundAudio() {
    if (!bgAudio) return;
    fadeVolume(bgAudio, BG_LOW_VOLUME, 400);
  }

  function restoreBackgroundAudio() {
    if (!bgAudio) return;
    fadeVolume(bgAudio, BG_NORMAL_VOLUME, 700);
  }

  // =========================
  // AUDIO
  // =========================
  function playBackgroundAudio() {
    if (!soundEnabled || !bgAudio) return;

    bgAudio.volume = BG_NORMAL_VOLUME;
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

  // =========================
  // SECTION ACTIVATION
  // =========================
  function activateSection(section) {
    if (!section) return;

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

    if (autoScrollEnabled && !autoScrollStoppedByUser) {
      scheduleNextAutoScroll();
    }
  }

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
  if (sections.length > 0) {
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
  }

  // =========================
  // LÖS KOD FÖR ATT DÖLJA CRAWL VID SCROLL
  // =========================

  function stopSectionMicroScroll() {
  if (autoScrollAnimationFrame) {
    cancelAnimationFrame(autoScrollAnimationFrame);
    autoScrollAnimationFrame = null;
  }

  if (sectionScrollTimeout) {
    clearTimeout(sectionScrollTimeout);
    sectionScrollTimeout = null;
  }
}

function startSectionMicroScroll(section, totalDuration) {
  if (!section || !autoScrollEnabled || autoScrollStoppedByUser) return;

  stopSectionMicroScroll();

  const sectionTop = section.offsetTop;
  const currentY = window.scrollY;

  // Hur långt ner vi vill röra oss inom sektionen
  const maxOffset = Math.max(0, section.offsetHeight - window.innerHeight);

  // Begränsa så det blir en subtil rörelse även om sektionen är hög
  const travel = Math.min(maxOffset, 220);

  // Om sektionen inte har extra höjd alls, gör inget
  if (travel <= 0) return;

  // Använd större delen av sektionens tid till långsam scroll
  const scrollDuration = totalDuration * 0.8;

  const startY = currentY;
  const targetY = Math.min(sectionTop + travel, sectionTop + maxOffset);
  const distance = targetY - startY;

  if (distance <= 0) return;

  const startTime = performance.now();

  function step(now) {
    if (!autoScrollEnabled || autoScrollStoppedByUser) return;

    const elapsed = now - startTime;
    const progress = Math.min(elapsed / scrollDuration, 1);

    // easeInOut för mjuk rörelse
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const nextY = startY + distance * eased;
    window.scrollTo(0, nextY);

    if (progress < 1) {
      autoScrollAnimationFrame = requestAnimationFrame(step);
    } else {
      autoScrollAnimationFrame = null;
    }
  }

  // Liten paus innan mikroscrollen börjar
  sectionScrollTimeout = setTimeout(() => {
    autoScrollAnimationFrame = requestAnimationFrame(step);
  }, 500);
}

  // =========================
  // INTRO RIDE
  // =========================
  function stopIntroRide() {
    if (introRideAnimationFrame) {
      cancelAnimationFrame(introRideAnimationFrame);
      introRideAnimationFrame = null;
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function startIntroRideToFirstSection() {
    return new Promise((resolve) => {
      if (!sections.length) {
        resolve();
        return;
      }

      stopIntroRide();

      const firstSection = getFirstStorySection();
      const startY = window.scrollY;
      const targetY = firstSection.offsetTop;
      const distance = targetY - startY;

      const wobbleAmount = Math.min(30, Math.abs(distance) * 0.08);
      const duration = 1800;
      const startTime = performance.now();

      function step(now) {
        if (!autoScrollEnabled || autoScrollStoppedByUser) {
          stopIntroRide();
          resolve();
          return;
        }

        const progress = Math.min((now - startTime) / duration, 1);
        const eased = easeOutCubic(progress);

        const baseY = startY + distance * eased;

        const wobble =
          Math.sin(progress * Math.PI * 3) *
          wobbleAmount *
          (1 - progress);

        window.scrollTo(0, baseY + wobble);

        if (progress < 1) {
          introRideAnimationFrame = requestAnimationFrame(step);
        } else {
          window.scrollTo({
            top: targetY,
            behavior: "auto"
          });

          introRideAnimationFrame = null;
          resolve();
        }
      }

      introRideAnimationFrame = requestAnimationFrame(step);
    });
  }
  // =========================
  // AUTOSCROLL
  // =========================
  function getSectionDuration(section) {
    const duration = parseInt(section.dataset.duration, 10);
    return Number.isNaN(duration) ? 15000 : duration;
  }

  function scheduleNextAutoScroll() {
    if (!experienceStarted || !autoScrollEnabled || autoScrollStoppedByUser) return;

    const currentSection = sections[currentSectionIndex];
    if (!currentSection) return;

    const waitTime = getSectionDuration(currentSection);

    clearTimeout(autoScrollTimeout);
    stopSectionMicroScroll();

    // Starta långsam scroll inom sektionen
    startSectionMicroScroll(currentSection, waitTime);

    // Hoppa vidare till nästa sektion när tiden är slut
    autoScrollTimeout = setTimeout(() => {
      goToNextSection();
    }, waitTime);
  }

  async function startAutoScroll() {
    autoScrollStoppedByUser = false;

    const firstSection = getFirstStorySection();

    await startIntroRideToFirstSection();

    if (firstSection) {
      activateSection(firstSection);
    }

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

    const nextIndex = currentSectionIndex + 1;

    if (nextIndex >= sections.length) {
      stopAutoScroll();

      if (toggleAutoscroll) {
        toggleAutoscroll.checked = false;
      }

      autoScrollEnabled = false;
      return;
    }

    sections[nextIndex].scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function userInterruptedAutoScroll() {
    if (!autoScrollEnabled) return;

    autoScrollStoppedByUser = true;
    stopAutoScroll();

    if (toggleAutoscroll) {
      toggleAutoscroll.checked = false;
    }

    autoScrollEnabled = false;
  }

  // =========================
  // EVENT LISTENERS
  // =========================

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

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
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