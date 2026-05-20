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

  const BG_NORMAL_VOLUME = 0.07;
  const BG_LOW_VOLUME = 0.04;
  const ERA_VOLUME = 0.5;

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

  function stopAllNonBackgroundAudio() {
    stopEraAudio();

    if (typeof stopArtifactAudio === "function") {
      stopArtifactAudio();
    }
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

    if (era) {
      body.classList.add(`theme-${era}`);
    }
  }

  function activateSection(section) {
    if (!section) return;

    sections.forEach((sec) => sec.classList.remove("active-section"));
    section.classList.add("active-section");

    currentSectionIndex = sections.indexOf(section);
    setThemeFromSection(section);

    stopAllNonBackgroundAudio();

    const audioSrc = section.dataset.audio || "";

    if (audioSrc) {
      playEraAudio(audioSrc);
    }

    if (section.classList.contains("touch-era") && autoScrollEnabled) {
      startTouchAutoSwipe();
    } else {
      stopTouchAutoSwipe();
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

  function updateActiveSectionByScroll() {
    if (!sections.length) return;

    const triggerPoint = window.innerHeight * 0.45;

    let activeSection = sections[0];

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();

      if (rect.top <= triggerPoint && rect.bottom >= triggerPoint) {
        activeSection = section;
      }
    });

    if (activeSection && sections[currentSectionIndex] !== activeSection) {
      activateSection(activeSection);
    }
  }

  observeActiveItems($$(".command-era .command-panel"), "command-active", "command-past", 0.35);
  observeActiveItems($$(".gui-era .gui-window"), "gui-active", "gui-past", 0.45);

  const artifactPanels = $$(".era-1 .artifact-panel");

  function updateArtifactPanelsByScroll() {
    if (!artifactPanels.length) return;

    const triggerPoint = window.innerHeight * 0.52;

    let activeIndex = 0;
    let closestDistance = Infinity;

    artifactPanels.forEach((panel, index) => {
      const rect = panel.getBoundingClientRect();

      const panelCenter = rect.top + rect.height / 2;
      const distance = Math.abs(panelCenter - triggerPoint);

      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    artifactPanels.forEach((panel, index) => {
      panel.classList.toggle("panel-active", index === activeIndex);
      panel.classList.toggle("panel-past", index < activeIndex);
    });
  }

  /* =========================
    AUTOSCROLL — UPDATED
  ========================= */

  const autoStops = [...document.querySelectorAll("[data-autostop]")];

  let autoStopIndex = 0;

  function getAutoStopDuration(stop) {
    const duration = parseInt(stop?.dataset.duration, 10);
    return Number.isNaN(duration) ? 12000 : duration;
  }

  function getCurrentAutoStopIndex() {
    let closestIndex = 0;
    let closestDistance = Infinity;

    autoStops.forEach((stop, index) => {
      const distance = Math.abs(stop.getBoundingClientRect().top);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  function stopAutoScrollAnimation() {
    if (autoScrollFrame) {
      cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame = null;
    }

    clearTimeout(autoScrollTimeout);
    autoScrollTimeout = null;
  }

  function smoothScrollToElement(element, duration = 8000) {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      if (autoScrollFrame) {
        cancelAnimationFrame(autoScrollFrame);
        autoScrollFrame = null;
      }

      const startY = window.scrollY;
      const targetY = element.getBoundingClientRect().top + window.scrollY;
      const distance = targetY - startY;
      const startTime = performance.now();

      function easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
      }

      function step(now) {
        if (!autoScrollEnabled || autoScrollStoppedByUser) {
          autoScrollFrame = null;
          resolve();
          return;
        }

        const progress = Math.min((now - startTime) / duration, 1);
        const eased = easeInOutSine(progress);

        window.scrollTo(0, startY + distance * eased);

        if (progress < 1) {
          autoScrollFrame = requestAnimationFrame(step);
        } else {
          autoScrollFrame = null;
          resolve();
        }
      }

      autoScrollFrame = requestAnimationFrame(step);
    });
  }

  function scheduleNextAutoStop() {
    if (!autoScrollEnabled || autoScrollStoppedByUser) return;

    const currentStop = autoStops[autoStopIndex];
    const nextStop = autoStops[autoStopIndex + 1];

    if (!currentStop || !nextStop) {
      autoScrollEnabled = false;

      if (toggleAutoscroll) {
        toggleAutoscroll.checked = false;
      }

      stopAutoScrollAnimation();
      return;
    }

    const duration = getAutoStopDuration(currentStop);

    clearTimeout(autoScrollTimeout);

    smoothScrollToElement(nextStop, duration).then(() => {
      if (!autoScrollEnabled || autoScrollStoppedByUser) return;

      autoStopIndex++;
      scheduleNextAutoStop();
    });
  }

  async function startAutoScroll() {
    autoScrollEnabled = true;
    autoScrollStoppedByUser = false;

    if (!experienceStarted) {
      unlockExperience({ skipInitialActivation: true });
    }

    autoStopIndex = getCurrentAutoStopIndex();

    const currentStop = autoStops[autoStopIndex];

    if (currentStop) {
      await smoothScrollToElement(currentStop, 1200);
      scheduleNextAutoStop();
    }
  }

  function stopAutoScroll() {
    autoScrollEnabled = false;
    stopAutoScrollAnimation();
    stopTouchAutoSwipe();
  }

  function userInterruptedAutoScroll() {
    if (!autoScrollEnabled) return;

    autoScrollStoppedByUser = true;
    autoScrollEnabled = false;

    if (toggleAutoscroll) {
      toggleAutoscroll.checked = false;
    }

    stopAutoScrollAnimation();
  }
  /* =========================
    OVERLAY FOR IMAGES
  ========================= */
  const imageOverlay = document.querySelector("#imageOverlay");
  const imageOverlayImg = document.querySelector("#imageOverlay img");
  const imageOverlayClose = document.querySelector(".image-overlay-close");

  document.querySelectorAll(".image-open-btn img").forEach((img) => {
    img.addEventListener("click", () => {
      imageOverlayImg.src = img.src;
      imageOverlayImg.alt = img.alt;
      imageOverlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });
  });

  function closeImageOverlay() {
    imageOverlay.classList.remove("is-open");
    imageOverlayImg.src = "";
    document.body.style.overflow = "";
  }

  imageOverlayClose?.addEventListener("click", closeImageOverlay);

  imageOverlay?.addEventListener("click", (event) => {
    if (event.target === imageOverlay) {
      closeImageOverlay();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeImageOverlay();
    }
  });

  /* =========================
    COMMAND TO GUI TRANSITION TYPE
  ========================= */

  const commandToGuiTransition = document.querySelector(".command-to-gui");
  const loadingText = document.querySelector(".command-to-gui .transition-loading");
  const doneText = document.querySelector(".command-to-gui .transition-done");

  let commandToGuiStarted = false;

  function typeTransitionText(element, text, speed = 70) {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      let index = 0;
      element.textContent = "";

      const interval = setInterval(() => {
        element.textContent += text[index];
        index++;

        if (index >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  if (commandToGuiTransition && loadingText && doneText) {
    const transitionObserver = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !commandToGuiStarted) {
            commandToGuiStarted = true;

            const loading = loadingText.dataset.text || "Nästa era laddar...";
            const done = doneText.dataset.text || "Laddningen är klar.";

            loadingText.textContent = "";
            doneText.textContent = "";
            doneText.classList.remove("is-visible");

            await typeTransitionText(loadingText, loading, 75);

            setTimeout(async () => {
              doneText.classList.add("is-visible");
              await typeTransitionText(doneText, done, 75);
            }, 3000);
          }
        }
      },
      { threshold: 0.45 }
    );

    transitionObserver.observe(commandToGuiTransition);
  }

  /* =========================
     SCROLL EFFECTS
  ========================= */

  const unixNode = document.querySelector(".unix-node");
  const codeRain = document.querySelector(".unix-node .code-rain");
  const unixLines = [...document.querySelectorAll(".unix-node .code-rain span")];
  const eniacPanel = $(".artifact-eniac");
  const messagePanel = $(".message-panel");
  const eraTransition = $(".command-to-gui");
  const outroSection = $(".outro-section");
  const outroInner = $(".outro-inner");
  const outroTitle = $(".outro-title");
  const outroLines = $$(".outro-text span");

  const typeSend = $(".type-send");
  const typeLo = $(".type-lo");

  function updateUnixLines() {
    if (!unixNode || !codeRain || unixLines.length === 0) return;

    const rect = unixNode.getBoundingClientRect();
    const scrollDistance = unixNode.offsetHeight - window.innerHeight;

    if (scrollDistance <= 0) return;

    const progress = clamp(
      -rect.top / scrollDistance,
      0,
      1
    );

    // Texten flyter nerifrån och upp
  const moveY = 180 - progress * 260;
  codeRain.style.transform = `translateY(${moveY}px)`;

    // När en rad passerar denna punkt blir den grön
    const revealPoint = window.innerHeight * 0.78;

    unixLines.forEach((line) => {
      const lineRect = line.getBoundingClientRect();
      const lineCenter = lineRect.top + lineRect.height / 2;

      line.classList.toggle("visible-line", lineCenter < revealPoint);
    });
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

    const rect = messagePanel.getBoundingClientRect();
    const scrollDistance = messagePanel.offsetHeight - window.innerHeight;
    if (scrollDistance <= 0) return;

    const progress = clamp(-rect.top / scrollDistance, 0, 1);

    const sendText = " send message";
    const loText = "LO";

    const sendCount = Math.floor(clamp(progress / 0.45) * sendText.length);
    const loCount = Math.floor(clamp((progress - 0.45) / 0.25) * loText.length);

    typeSend.textContent = sendText.slice(0, sendCount);
    typeLo.textContent = loText.slice(0, loCount);

    const loLine = document.querySelector(".lo-line");

    if (loLine) {
      loLine.classList.toggle("is-typing", progress >= 0.45);
    }
  }

  function updateEraTransition() {
    return;
  }

  const phoneScreen = document.querySelector(".phone-screen");
  const touchPanels = [...document.querySelectorAll(".touch-era .phone-panel")];
  const phonePrev = document.querySelector(".phone-prev");
  const phoneNext = document.querySelector(".phone-next");

  let activeTouchIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  function showTouchPanel(index) {
    if (!touchPanels.length) return;

    activeTouchIndex = Math.max(0, Math.min(index, touchPanels.length - 1));

    touchPanels.forEach((panel, i) => {
      panel.classList.toggle("touch-active", i === activeTouchIndex);
      panel.classList.toggle("touch-past", i < activeTouchIndex);
      panel.classList.toggle("touch-next", i > activeTouchIndex);
    });

    phonePrev?.classList.toggle("is-hidden", activeTouchIndex === 0);
    phoneNext?.classList.toggle("is-hidden", activeTouchIndex === touchPanels.length - 1);

    const activePanel = touchPanels[activeTouchIndex];
    const audioSrc = activePanel?.dataset.audio;

    if (audioSrc && experienceStarted && typeof playArtifactAudio === "function") {
      playArtifactAudio(audioSrc);
    }
  }

  function nextTouchPanel() {
    showTouchPanel(activeTouchIndex + 1);
  }

  function prevTouchPanel() {
    showTouchPanel(activeTouchIndex - 1);
  }

  phoneNext?.addEventListener("click", nextTouchPanel);
  phonePrev?.addEventListener("click", prevTouchPanel);

  phoneScreen?.addEventListener("pointerdown", (event) => {
    touchStartX = event.clientX;
    touchStartY = event.clientY;
    phoneScreen.classList.add("is-dragging");
  });

  phoneScreen?.addEventListener("pointerup", (event) => {
    phoneScreen.classList.remove("is-dragging");

    const diffX = event.clientX - touchStartX;
    const diffY = event.clientY - touchStartY;

    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        nextTouchPanel();
      } else {
        prevTouchPanel();
      }
    }
  });

  let touchAutoTimer = null;

  function stopTouchAutoSwipe() {
    if (touchAutoTimer) {
      clearTimeout(touchAutoTimer);
      touchAutoTimer = null;
    }
  }

  function startTouchAutoSwipe() {
    if (!touchPanels.length) return;

    stopTouchAutoSwipe();

    showTouchPanel(0);

    let index = 0;

    function step() {
      if (!autoScrollEnabled || autoScrollStoppedByUser) return;

      index++;

      if (index >= touchPanels.length) {
        stopTouchAutoSwipe();
        return;
      }

      showTouchPanel(index);

      touchAutoTimer = setTimeout(step, 4200);
    }

    touchAutoTimer = setTimeout(step, 4200);
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
      outroInner.style.opacity = 1 - blurProgress;
      outroInner.style.transform = `translateY(${blurProgress * 20}px)`;
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

  const arpanetSection = document.querySelector(".arpanet-scroll-section");
  const arpanetZoom = document.querySelector(".arpanet-zoom");

  function updateArpanetZoom() {
    if (!arpanetSection || !arpanetZoom) return;

    const rect = arpanetSection.getBoundingClientRect();
    const scrollDistance = arpanetSection.offsetHeight - window.innerHeight;

    if (scrollDistance <= 0) return;

    const progress = clamp(
      -rect.top / scrollDistance,
      0,
      1
    );

    let scale;
    let opacity;

    // Första delen: videon växer
    if (progress < 0.65) {
      const p = progress / 0.65;

      scale = 0.65 + p * 0.55; // 0.65 → 1.2
      opacity = 0.5 + p * 0.5; // 0.5 → 1
    }

    // Resten av sektionen: videon stannar stor
    else {
      scale = 1.2;
      opacity = 1;
    }

    arpanetZoom.style.transform = `scale(${scale})`;
    arpanetZoom.style.opacity = opacity;
  }

  function onScroll() {
    updateActiveSectionByScroll();
    updateArtifactPanelsByScroll();
    updateUnixLines();
    updateEniacCurtains();
    updateMessageTyping();
    updateEraTransition();
    updateOutroBlur();
    updateArpanetZoom();
    updateMultimodalScroll();
  }

  /* =========================
    1970 TERMINAL — ISOLERAD
  ========================= */

  const seventiesTerminalPanel = document.querySelector(".seventies-terminal-panel");
  const seventiesLines = [
    ...document.querySelectorAll(".seventies-terminal-panel .seventies-type-line")
  ];

  let seventiesTerminalStarted = false;

  function seventiesTypeText(element, text, speed = 55) {
    return new Promise((resolve) => {
      let index = 0;
      element.textContent = "";

      const interval = setInterval(() => {
        element.textContent += text[index];
        index++;

        if (index >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  async function startSeventiesTerminal() {
    if (seventiesTerminalStarted) return;
    if (!seventiesTerminalPanel || seventiesLines.length === 0) return;

    seventiesTerminalStarted = true;
    seventiesTerminalPanel.classList.add("seventies-active");

    for (const line of seventiesLines) {
      const text = line.dataset.text || "";

      if (line.classList.contains("seventies-slow-line")) {
        await seventiesTypeText(line, text, 420);
      } else {
        await seventiesTypeText(line, text, 55);
      }

      await new Promise((resolve) => setTimeout(resolve, 420));
    }
  }

  if (seventiesTerminalPanel) {
    const seventiesObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startSeventiesTerminal();
          }
        });
      },
      { threshold: 0.45 }
    );

    seventiesObserver.observe(seventiesTerminalPanel);
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
    if (!soundEnabled || !src) return;
    if (activeArtifactAudioSrc === src) return;

    if (artifactFadeFrame) {
      cancelAnimationFrame(artifactFadeFrame);
      artifactFadeFrame = null;
    }

    artifactAudio.pause();
    artifactAudio.currentTime = 0;
    artifactAudio.removeAttribute("src");
    artifactAudio.load();

    activeArtifactAudioSrc = src;
    artifactAudio.src = src;
    artifactAudio.currentTime = 0;
    artifactAudio.volume = 0;

    artifactAudio.play()
      .then(() => fadeArtifactAudio(0.9, 700))
      .catch(() => console.log("Artefaktljud kunde inte spelas."));
  }

  function stopArtifactAudio() {
    if (artifactFadeFrame) {
      cancelAnimationFrame(artifactFadeFrame);
      artifactFadeFrame = null;
    }

    artifactAudio.pause();
    artifactAudio.currentTime = 0;
    artifactAudio.removeAttribute("src");
    artifactAudio.load();

    activeArtifactAudioSrc = "";
  }

  const audioArtifacts = $$("[data-audio]")
    .filter((el) => !el.classList.contains("story-section"));

  if (audioArtifacts.length) {
    const artifactAudioObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const src = entry.target.dataset.audio;

        if (entry.isIntersecting) {
          stopEraAudio();
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

  const multiScenes = [...document.querySelectorAll(".multimodal-era .multi-scene")];
  const aiType = document.querySelector(".ai-type");

  const aiText = "Fråga vad som helst...";

  function typeAiPrompt(progress) {
    if (!aiType) return;

    const count = Math.floor(progress * aiText.length);
    aiType.textContent = aiText.slice(0, count);
  }

  if (multiScenes.length > 0) {
    const multiObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          multiScenes.forEach((scene) => {
            scene.classList.remove("multi-active", "multi-past");
          });

          entry.target.classList.add("multi-active");

          const activeIndex = multiScenes.indexOf(entry.target);

          multiScenes.forEach((scene, index) => {
            if (index < activeIndex) {
              scene.classList.add("multi-past");
            }
          });
        });
      },
      {
        threshold: 0.45
      }
    );

    multiScenes.forEach((scene) => multiObserver.observe(scene));
  }

  function updateMultimodalScroll() {
    const aiScene = document.querySelector(".ai-scene");
    if (!aiScene) return;

    const rect = aiScene.getBoundingClientRect();

    const progress = Math.min(
      Math.max((window.innerHeight - rect.top) / window.innerHeight, 0),
      1
    );

    typeAiPrompt(progress);
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
  showTouchPanel(0);
   onScroll();
});