// ===== ERA STYLE SWITCH =====
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const startOverlay = document.getElementById("startOverlay");
  const controlPanel = document.getElementById("controlPanel");

  const bgAudio = document.getElementById("bgAudio");
  const eraAudio = document.getElementById("eraAudio");

  const toggleSound = document.getElementById("toggleSound");
  const toggleAutoscroll = document.getElementById("toggleAutoscroll");

  const sections = [...document.querySelectorAll(".story-section")];

  const outroSection = document.querySelector(".outro-section");
  const outroInner = document.querySelector(".outro-inner");
  const outroTitle = document.querySelector(".outro-title");
  const outroLines = document.querySelectorAll(".outro-text span");

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
  function unlockExperience({ skipInitialActivation = false } = {}) {
    experienceStarted = true;
    body.classList.remove("is-locked");

    if (startOverlay) {
      startOverlay.classList.add("hidden");
    }

    if (controlPanel) {
      controlPanel.classList.remove("hidden");
    }

    playBackgroundAudio();

    if (!skipInitialActivation && sections.length > 0) {
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
  // Långsam autoscroll inom aktiv sektion
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
    const maxOffset = Math.max(0, section.offsetHeight - window.innerHeight);
    const maxTargetY = sectionTop + maxOffset;

    const startY = Math.max(window.scrollY, sectionTop);
    const travel = Math.min(maxOffset, 220);

    if (travel <= 0) return;
    if (startY >= maxTargetY) return;

    const scrollDuration = totalDuration * 0.8;
    const targetY = Math.min(startY + travel, maxTargetY);
    const distance = targetY - startY;

    if (distance <= 0) return;

    const startTime = performance.now();

    function step(now) {
      if (!autoScrollEnabled || autoScrollStoppedByUser) return;

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);

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

    sectionScrollTimeout = setTimeout(() => {
      autoScrollAnimationFrame = requestAnimationFrame(step);
    }, 300);
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

  function getFirstStorySection() {
    return sections.find((section) => section.dataset.era !== "intro") || sections[0];
  }

  function startRideToSection(targetSection) {
    return new Promise((resolve) => {
      if (!targetSection) {
        resolve();
        return;
      }

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

  function getAutoScrollTargetSection() {
    if (!experienceStarted) {
      return getFirstStorySection();
    }

    const currentSection = sections[currentSectionIndex];

    if (!currentSection) {
      return getFirstStorySection();
    }

    if (currentSection.dataset.era === "intro") {
      return getFirstStorySection();
    }

    return sections[currentSectionIndex + 1] || currentSection;
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

  if (toggleAutoscroll) {
    toggleAutoscroll.addEventListener("change", async (event) => {
      autoScrollEnabled = event.target.checked;

      if (autoScrollEnabled) {
        await startAutoScroll();
      } else {
        stopAutoScroll();
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

  // =========================
  // ERA 1 PANEL ACTIVATION
  // =========================
  const artifactPanels = [...document.querySelectorAll(".era-1 .artifact-panel")];

  if (artifactPanels.length > 0) {
    const panelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          artifactPanels.forEach((panel) => {
            panel.classList.remove("panel-active", "panel-past");
          });

          entry.target.classList.add("panel-active");

          const activeIndex = artifactPanels.indexOf(entry.target);

          artifactPanels.forEach((panel, index) => {
            if (index < activeIndex) {
              panel.classList.add("panel-past");
            }
          });
        });
      },
      {
        threshold: 0.15
      }
    );

    artifactPanels.forEach((panel) => panelObserver.observe(panel));
  }

  // =========================
  // ERA 2 COMMAND NODE ACTIVATION
  // =========================
  const commandNodes = [...document.querySelectorAll(".command-era .command-panel")];
  
  if (commandNodes.length > 0) {
    const commandObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
  
          commandNodes.forEach((node) => {
            node.classList.remove("command-active", "command-past");
          });
  
          entry.target.classList.add("command-active");
  
          const activeIndex = commandNodes.indexOf(entry.target);
  
          commandNodes.forEach((node, index) => {
            if (index < activeIndex) {
              node.classList.add("command-past");
            }
          });
        });
      },
      {
        threshold: 0.35
      }
    );
  
    commandNodes.forEach((node) => commandObserver.observe(node));
  }

  // =========================
  // ERA 2 fade scroll
  // =========================

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
    updateHorizontalScroll();
    updateActiveEra();
    updateOutroBlur();
  }


  // =========================
  // UNIX TEXT REVEAL ON SCROLL
  // =========================
  const unixNode = document.querySelector(".unix-node");
  const unixLines = [...document.querySelectorAll(".unix-node .code-rain span")];

  function updateUnixLines() {
    if (!unixNode || unixLines.length === 0) return;

    const start = unixNode.offsetTop;
    const end = start + unixNode.offsetHeight - window.innerHeight;

    const progress = clamp(
      (window.scrollY - start) / (end - start),
      0,
      1
    );

    const visibleCount = Math.floor(progress * (unixLines.length + 1));

    unixLines.forEach((line, index) => {
      line.classList.toggle("visible-line", index < visibleCount);
    });
  }

  window.addEventListener("scroll", updateUnixLines, { passive: true });
  window.addEventListener("resize", updateUnixLines);

  updateUnixLines();

  // =========================
  // STICKY SCROLL-STYRDA ENIAC-GARDINER
  // =========================
  const eniacPanel = document.querySelector(".artifact-eniac");

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateEniacCurtains() {
    if (!eniacPanel) return;

    const start = eniacPanel.getBoundingClientRect().top + window.scrollY;
    const end = start + eniacPanel.offsetHeight - window.innerHeight;

    if (end <= start) return;

    const progress = clamp(
      (window.scrollY - start) / (end - start),
      0,
      1
    );

    const curtainOpen = progress * 100;

    eniacPanel.style.setProperty("--curtain-open", curtainOpen);
  }

  window.addEventListener("scroll", updateEniacCurtains, { passive: true });
  window.addEventListener("resize", updateEniacCurtains);

  updateEniacCurtains();

  // =========================
  // ARTIFACT AUDIO
  // =========================
  const artifactAudio = new Audio();
  artifactAudio.volume = 0;
  let activeArtifactAudioSrc = "";
  let artifactFadeFrame = null;

  function fadeArtifactAudio(targetVolume, duration = 600) {
    if (artifactFadeFrame) {
      cancelAnimationFrame(artifactFadeFrame);
    }

    const startVolume = artifactAudio.volume;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      artifactAudio.volume =
        startVolume + (targetVolume - startVolume) * progress;

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
    if (!soundEnabled || !src) return;
    if (activeArtifactAudioSrc === src) return;

    if (artifactFadeFrame) {
      cancelAnimationFrame(artifactFadeFrame);
    }

    activeArtifactAudioSrc = src;
    artifactAudio.pause();
    artifactAudio.src = src;
    artifactAudio.currentTime = 0;
    artifactAudio.volume = 0;

    artifactAudio.play().then(() => {
      fadeArtifactAudio(0.9, 700);
    }).catch(() => {
      console.log("Artefaktljud kunde inte spelas.");
    });
  }

  function stopArtifactAudio() {
    if (!activeArtifactAudioSrc) return;
    fadeArtifactAudio(0, 500);
  }

  const audioArtifacts = [
  ...document.querySelectorAll("[data-audio]")
  ].filter((el) => !el.classList.contains("story-section"));

  if (audioArtifacts.length > 0) {
    const artifactAudioObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            playArtifactAudio(entry.target.dataset.audio);
          } else if (activeArtifactAudioSrc === entry.target.dataset.audio) {
            stopArtifactAudio();
          }
        });
      },
      {
        threshold: 0.55
      }
    );

    audioArtifacts.forEach((artifact) => artifactAudioObserver.observe(artifact));
  }

  // =========================
  // SEND MESSAGE SCROLL TYPE
    // =========================
  const messagePanel = document.querySelector(".message-panel");
  const typeSend = document.querySelector(".type-send");
  const typeLo = document.querySelector(".type-lo");

  const sendText = " send message";
  const loText = "LO";

  function updateMessageTyping() {
    if (!messagePanel || !typeSend || !typeLo) return;

    const start = messagePanel.offsetTop;
    const end = start + messagePanel.offsetHeight - window.innerHeight;

    const progress = clamp(
      (window.scrollY - start) / (end - start),
      0,
      1
    );

    const sendCount = Math.floor(clamp(progress / 0.55, 0, 1) * sendText.length);
    const loCount = Math.floor(clamp((progress - 0.6) / 0.25, 0, 1) * loText.length);

    typeSend.textContent = sendText.slice(0, sendCount);
    typeLo.textContent = loText.slice(0, loCount);
  }

  window.addEventListener("scroll", updateMessageTyping, { passive: true });
  window.addEventListener("resize", updateMessageTyping);

  updateMessageTyping();

  // =========================
  // ERA 2 → ERA 3 TRANSITION
  // =========================
  const eraTransition = document.querySelector(".command-to-gui");

  function updateEraTransition() {
    if (!eraTransition) return;

    const rect = eraTransition.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    const progress = clamp(
      (windowHeight - rect.top) / (windowHeight + rect.height),
      0,
      1
    );

    if (progress > 0.45) {
      eraTransition.classList.add("transition-gui");
    } else {
      eraTransition.classList.remove("transition-gui");
    }
  }

  window.addEventListener("scroll", updateEraTransition, { passive: true });
  window.addEventListener("resize", updateEraTransition);

  updateEraTransition();

  // =========================
  // ERA 3 GUI WINDOW ACTIVATION
  // =========================
  const guiWindows = [...document.querySelectorAll(".gui-era .gui-window")];

  if (guiWindows.length > 0) {
    const guiObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          guiWindows.forEach((win) => {
            win.classList.remove("gui-active", "gui-past");
          });

          entry.target.classList.add("gui-active");

          const activeIndex = guiWindows.indexOf(entry.target);

          guiWindows.forEach((win, index) => {
            if (index < activeIndex) {
              win.classList.add("gui-past");
            }
          });
        });
      },
      {
        threshold: 0.45
      }
    );

    guiWindows.forEach((win) => guiObserver.observe(win));
  }

  // =========================
  // ERA 4 TOUCH PANEL ACTIVATION BY SCROLL
  // =========================
  const touchScene = document.querySelector(".phone-scroll-scene");
  const touchPanels = [...document.querySelectorAll(".touch-era .phone-panel")];

  function updateTouchPanels() {
    if (!touchScene || touchPanels.length === 0) return;

    const rect = touchScene.getBoundingClientRect();
    const scrollableDistance = touchScene.offsetHeight - window.innerHeight;

    const progress = clamp(
      -rect.top / scrollableDistance,
      0,
      1
    );

    const activeIndex = Math.min(
      touchPanels.length - 1,
      Math.floor(progress * touchPanels.length)
    );

    touchPanels.forEach((panel, index) => {
      panel.classList.toggle("touch-active", index === activeIndex);
      panel.classList.toggle("touch-past", index < activeIndex);
    });
  }

  window.addEventListener("scroll", updateTouchPanels, { passive: true });
  window.addEventListener("resize", updateTouchPanels);

  updateTouchPanels();
});
// VIKTIGT (utanför!)
// Hindra browsern från att minnas scroll-position
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
