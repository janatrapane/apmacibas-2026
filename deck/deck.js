// Presentation engine. One classic script, no framework, no build step: the deck
// opens straight from file:// on a presenting laptop with no server and no network.
//
// Authoring contract (see references/engine.md in the skill):
//   <section class="slide" data-title="…">          one slide; data-title feeds the slide list
//   data-theme="dark"                                 dark slide (the whole field switches)
//   data-chrome="off"                                 hide counter and logo on this slide
//   class="slide--bleed"                              let visuals run past the 1920x1080 stage
//   <el class="build" data-build="1">                 revealed on click 1 (builds are opt-in)
//   data-motion="fade-up|fade-in|scale-in|card-in"    reveal motion; data-delay / data-duration in ms
//   <video data-src="…" data-autoplay muted>          loaded on its slide only, released on exit
//   <iframe data-src="…">                             same for embeds (YouTube etc.)
//   <template class="notes">…</template>              speaker notes for the presenter window (S)
//   [ALL CAPS IN BRACKETS]                            placeholder, rendered as a yellow mark
(function () {
  "use strict";

  const STAGE_WIDTH = 1920;
  const STAGE_HEIGHT = 1080;
  const STATUS_CLASSES = ["is-hidden", "is-current", "is-past", "is-visible"];
  const PLACEHOLDER = /\[\p{Lu}[\p{Lu}\p{N}\s.,:;/&'’+\-–()]*\]/gu;

  // ---- state: pure, so a reload or a deep link always rebuilds the same picture ----
  function safeInteger(value, fallback = 0) {
    return Number.isInteger(value) ? value : fallback;
  }
  function clampState(state, counts) {
    const slideIndex = Math.max(0, Math.min(counts.length - 1, safeInteger(state?.slideIndex)));
    const max = Math.max(0, safeInteger(counts[slideIndex]));
    const buildIndex = Math.max(0, Math.min(max, safeInteger(state?.buildIndex)));
    return { slideIndex, buildIndex };
  }
  function advanceState(state, counts) {
    const c = clampState(state, counts);
    if (c.buildIndex < (counts[c.slideIndex] ?? 0)) return { ...c, buildIndex: c.buildIndex + 1 };
    if (c.slideIndex >= counts.length - 1) return c;
    return { slideIndex: c.slideIndex + 1, buildIndex: 0 };
  }
  function retreatState(state, counts) {
    const c = clampState(state, counts);
    if (c.buildIndex > 0) return { ...c, buildIndex: c.buildIndex - 1 };
    if (c.slideIndex === 0) return c;
    // Stepping back opens the previous slide from its start, so its reveals play again.
    return { slideIndex: c.slideIndex - 1, buildIndex: 0 };
  }
  function stateFromHash(hash, counts) {
    const m = /^#slide-(\d+)(?:\/build-(\d+))?$/.exec(hash ?? "");
    if (!m) return clampState({ slideIndex: 0, buildIndex: 0 }, counts);
    return clampState({ slideIndex: Number(m[1]) - 1, buildIndex: m[2] ? Number(m[2]) : 0 }, counts);
  }
  function hashForState(s) {
    return `#slide-${s.slideIndex + 1}/build-${s.buildIndex}`;
  }

  // ---- builds ----
  function nonNegativeInteger(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  function buildCount(slide) {
    let max = 0;
    slide.querySelectorAll(".build[data-build]").forEach((el) => { max = Math.max(max, nonNegativeInteger(el.dataset.build)); });
    return max;
  }
  function buildStatus(layerBuild, activeBuild) {
    const layer = Number.parseInt(layerBuild, 10);
    if (!Number.isFinite(layer) || layer <= 0) return "hidden";
    if (layer < activeBuild) return "past";
    if (layer === activeBuild) return "current";
    return "hidden";
  }
  const KEYFRAMES = {
    "fade-up": [
      { opacity: 0, transform: "translate3d(0, 28px, 0)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ],
    "fade-in": [{ opacity: 0 }, { opacity: 1 }],
    "scale-in": [
      { opacity: 0, transform: "scale(0.92)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    "card-in": [
      { opacity: 0, transform: "translate3d(0, 60px, 0) scale(0.96)" },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
    ],
  };
  function animateLayer(el, reduced) {
    if (reduced || typeof el.animate !== "function") return;
    el.getAnimations?.().forEach((a) => a.cancel());
    el.animate(KEYFRAMES[el.dataset.motion ?? "fade-up"] ?? KEYFRAMES["fade-in"], {
      duration: nonNegativeInteger(el.dataset.duration) || 640,
      delay: nonNegativeInteger(el.dataset.delay),
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "both",
    });
  }
  function applyBuildState(slide, buildIndex, reduced) {
    slide.dataset.buildIndex = String(buildIndex);
    slide.querySelectorAll(".build[data-build]").forEach((el) => {
      const status = buildStatus(el.dataset.build, buildIndex);
      el.classList.remove(...STATUS_CLASSES);
      el.classList.add(`is-${status}`);
      if (status !== "hidden") el.classList.add("is-visible");
      el.setAttribute("aria-hidden", status === "hidden" ? "true" : "false");
      if (status === "current") animateLayer(el, reduced);
      // A finished fill:"both" animation would keep a hidden layer visible after stepping back.
      else if (status === "hidden") el.getAnimations?.().forEach((a) => a.cancel());
      else el.getAnimations?.().forEach((a) => a.finish());
    });
    slide.dispatchEvent(new CustomEvent("deck:buildchange", { bubbles: true, detail: { buildIndex } }));
  }

  // ---- placeholders: [ALL CAPS] text becomes a yellow mark, so nothing unfinished ships unnoticed ----
  function markPlaceholders(root, doc) {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest("script, style, .ph")) continue;
      PLACEHOLDER.lastIndex = 0;
      if (PLACEHOLDER.test(node.nodeValue)) hits.push(node);
    }
    let count = 0;
    hits.forEach((text) => {
      const frag = doc.createDocumentFragment();
      let last = 0;
      text.nodeValue.replace(PLACEHOLDER, (match, offset) => {
        frag.append(text.nodeValue.slice(last, offset));
        const mark = doc.createElement("mark");
        mark.className = "ph";
        mark.textContent = match;
        frag.append(mark);
        last = offset + match.length;
        count += 1;
        return match;
      });
      frag.append(text.nodeValue.slice(last));
      text.replaceWith(frag);
    });
    // SVG text cannot hold a <mark>; flag the whole <text> element instead.
    root.querySelectorAll("svg text").forEach((t) => {
      PLACEHOLDER.lastIndex = 0;
      if (PLACEHOLDER.test(t.textContent) && !t.classList.contains("ph-svg")) { t.classList.add("ph-svg"); count += 1; }
    });
    return count;
  }

  // ---- presentation ----
  function isInteractive(el) {
    return Boolean(el?.closest?.("button, a, input, textarea, select, video[controls], audio[controls], [role='button']"));
  }
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function createPresentation(doc, win) {
    const stage = doc.getElementById("stage");
    const slides = Array.from(doc.querySelectorAll(".slide"));
    const progress = doc.getElementById("progress-bar");
    const counter = doc.getElementById("slide-counter");
    const toc = doc.getElementById("toc");
    const tocList = doc.getElementById("toc-list");
    const help = doc.getElementById("help");
    const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Published inside a sandboxed iframe (AI Platform artifacts and similar), the page has an
    // opaque origin: it may not rewrite the URL or reach into a popup's document.
    const sandboxed = (() => { try { return win.origin === "null"; } catch { return true; } })();
    if (!slides.length) throw new Error("deck.js: no .slide elements found");

    slides.forEach((s, i) => {
      if (!s.id) s.id = `slide-${i + 1}`;
      if (!s.dataset.title) s.dataset.title = s.querySelector("h1, h2")?.textContent.trim() || `Slide ${i + 1}`;
    });
    const counts = slides.map(buildCount);
    const placeholders = markPlaceholders(doc.getElementById("slides") || stage, doc);
    if (placeholders) console.warn(`deck.js: ${placeholders} placeholder(s) left`);
    const phCount = doc.getElementById("ph-count");
    if (phCount) phCount.textContent = placeholders ? `${placeholders} placeholder(s) still to fill` : "";

    let state = stateFromHash(win.location.hash, counts);
    let rendered = -1;
    let presenter = null;
    let startedAt = Date.now();

    function resizeStage() {
      const scale = Math.min(win.innerWidth / STAGE_WIDTH, win.innerHeight / STAGE_HEIGHT);
      stage.style.setProperty("--stage-scale", String(scale));
      stage.style.setProperty("--stage-x", `${(win.innerWidth - STAGE_WIDTH * scale) / 2}px`);
      stage.style.setProperty("--stage-y", `${(win.innerHeight - STAGE_HEIGHT * scale) / 2}px`);
    }

    // Video and embeds load only on their own slide and are released on exit.
    // Mobile Safari kills the tab when many <video> elements hold decoders at once,
    // and an unloaded iframe is the only reliable way to stop embedded sound.
    function syncMedia(active) {
      slides.forEach((slide) => {
        const on = slide === active;
        slide.querySelectorAll("iframe[data-src]").forEach((f) => {
          if (on) { if (!f.getAttribute("src")) f.src = f.dataset.src; }
          else if (f.getAttribute("src")) f.removeAttribute("src");
        });
        slide.querySelectorAll("video[data-src]").forEach((v) => {
          if (on) {
            if (!v.getAttribute("src")) { v.src = v.dataset.src; v.preload = "auto"; }
          } else if (v.getAttribute("src")) {
            v.pause();
            v.removeAttribute("src");
            v.load();
          }
        });
      });
      active.querySelectorAll("video[data-autoplay]").forEach((v) => {
        if (v.closest(".build.is-hidden")) { v.pause(); return; }
        if (v.paused) {
          if (v.closest(".build.is-current")) try { v.currentTime = 0; } catch { /* not loaded yet */ }
          v.play().catch(() => { /* autoplay blocked: the controls remain */ });
        }
      });
    }

    function render() {
      const active = slides[state.slideIndex];
      const entered = rendered !== state.slideIndex;
      slides.forEach((slide, i) => {
        const on = i === state.slideIndex;
        slide.classList.toggle("is-active", on);
        slide.setAttribute("aria-hidden", on ? "false" : "true");
      });
      // A deep link straight into build 3 shows builds 1-3 at once, without replaying them.
      applyBuildState(active, state.buildIndex, reduced || (entered && state.buildIndex > 0));
      doc.documentElement.dataset.theme = active.dataset.theme || "light";
      syncMedia(active);
      rendered = state.slideIndex;
      if (progress) progress.style.width = `${((state.slideIndex + 1) / slides.length) * 100}%`;
      if (counter) counter.textContent = `${pad(state.slideIndex + 1)} / ${pad(slides.length)}`;
      tocList?.querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-current", Number(b.dataset.slideIndex) === state.slideIndex ? "true" : "false");
      });
      try { win.history.replaceState(null, "", hashForState(state)); } catch { /* sandboxed frame: no URL updates */ }
      updatePresenter();
    }

    function goTo(next) {
      state = clampState(next, counts);
      render();
      return { ...state };
    }
    const next = () => goTo(advanceState(state, counts));
    const previous = () => goTo(retreatState(state, counts));

    // Presenter window (S): notes, next slide, clock, elapsed time. The popup is
    // about:blank, so it shares this page's origin even on file:// and keys work in both.
    // Where a popup cannot work (sandboxed frame, popup blocked), S toggles a notes panel
    // at the bottom of the page instead.
    let notesPanel = null;
    function openPresenter() {
      if (sandboxed) { toggleNotesPanel(); return; }
      if (presenter && !presenter.closed) { presenter.focus(); return; }
      presenter = win.open("", "deck-presenter", "width=960,height=680");
      let p = null;
      try { p = presenter?.document; p?.body; } catch { p = null; }
      if (!p) { presenter?.close(); presenter = null; toggleNotesPanel(); return; }
      p.title = `Presenter · ${doc.title}`;
      p.body.innerHTML = `
        <style>
          body{margin:0;font-family:system-ui,sans-serif;background:#0d1024;color:#e9ebf5;display:grid;grid-template-rows:auto 1fr auto;height:100vh}
          header{display:flex;justify-content:space-between;gap:24px;padding:18px 24px;font-size:20px;border-bottom:1px solid #262b4d}
          #n{padding:24px;font-size:26px;line-height:1.5;overflow:auto;white-space:pre-line}
          footer{display:flex;justify-content:space-between;padding:16px 24px;border-top:1px solid #262b4d;color:#a9aee0;font-size:19px}
          b{color:#fff} button{font:inherit;color:#a9aee0;background:none;border:1px solid #3a4070;border-radius:8px;padding:2px 10px;cursor:pointer}
        </style>
        <header><span id="pos"></span><span id="clock"></span></header>
        <div id="n"></div>
        <footer><span id="nx"></span><button id="reset" type="button">Reset timer</button></footer>`;
      p.addEventListener("keydown", handleKeydown);
      p.getElementById("reset").addEventListener("click", () => { startedAt = Date.now(); updatePresenter(); });
      updatePresenter();
    }
    function toggleNotesPanel() {
      if (notesPanel) { notesPanel.remove(); notesPanel = null; return; }
      notesPanel = doc.createElement("aside");
      notesPanel.setAttribute("aria-label", "Speaker notes");
      notesPanel.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:95;max-height:38vh;overflow:auto;padding:14px 20px;border-radius:12px;background:rgba(10,14,34,.98);color:#e9ebf5;font:18px/1.45 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.35)";
      notesPanel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:16px;color:#a9aee0;font-size:15px;margin-bottom:6px"><span data-pos></span><span data-clock></span></div><div data-notes style="white-space:pre-line"></div><div data-next style="color:#a9aee0;font-size:15px;margin-top:8px"></div>`;
      notesPanel.addEventListener("click", (e) => e.stopPropagation()); // reading notes is not a click to advance
      doc.body.append(notesPanel);
      updatePresenter();
    }
    function updatePresenter() {
      const popup = presenter && !presenter.closed ? presenter.document : null;
      if (!popup && !notesPanel) return;
      const s = slides[state.slideIndex];
      const nxt = slides[state.slideIndex + 1];
      const builds = counts[state.slideIndex] ? ` · build ${state.buildIndex}/${counts[state.slideIndex]}` : "";
      const pos = `<b>${pad(state.slideIndex + 1)}/${pad(slides.length)}</b> ${esc(s.dataset.title)}${builds}`;
      const raw = s.querySelector("template.notes")?.content.textContent ?? "";
      const notes = raw.split("\n").map((l) => l.trim()).join("\n").trim() || "(no notes)";
      const upcoming = nxt ? `Next: ${nxt.dataset.title}` : "Last slide";
      const now = new Date();
      const clock = `${pad(now.getHours())}:${pad(now.getMinutes())} · ${Math.floor((Date.now() - startedAt) / 60000)} min`;
      if (popup) {
        popup.getElementById("pos").innerHTML = pos;
        popup.getElementById("n").textContent = notes;
        popup.getElementById("nx").textContent = upcoming;
        popup.getElementById("clock").textContent = clock;
      }
      if (notesPanel) {
        notesPanel.querySelector("[data-pos]").innerHTML = pos;
        notesPanel.querySelector("[data-notes]").textContent = notes;
        notesPanel.querySelector("[data-next]").textContent = upcoming;
        notesPanel.querySelector("[data-clock]").textContent = clock;
      }
    }
    win.setInterval(updatePresenter, 10000);

    function openOverlay(o) { if (!o) return; closeOverlays(); o.classList.add("is-open"); o.setAttribute("aria-hidden", "false"); }
    function closeOverlays() { [toc, help].forEach((o) => { if (!o) return; o.classList.remove("is-open"); o.setAttribute("aria-hidden", "true"); }); }

    async function toggleFullscreen() {
      try {
        if (doc.fullscreenElement) await doc.exitFullscreen();
        else await doc.documentElement.requestFullscreen();
      } catch { /* not available (iframe, iOS) */ }
    }

    function handleKeydown(event) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isInteractive(event.target)) return;
      const k = event.key;
      const lower = k.length === 1 ? k.toLowerCase() : k;
      // Presentation clickers send PageDown/PageUp or arrows, and B or "." for a blank screen.
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { event.preventDefault(); next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { event.preventDefault(); previous(); }
      else if (k === "Home") { event.preventDefault(); goTo({ slideIndex: 0, buildIndex: 0 }); }
      else if (k === "End") { event.preventDefault(); goTo({ slideIndex: slides.length - 1, buildIndex: 0 }); }
      else if (lower === "r") { event.preventDefault(); goTo({ slideIndex: state.slideIndex, buildIndex: 0 }); }
      else if (lower === "t") { event.preventDefault(); openOverlay(toc); }
      else if (lower === "f") { event.preventDefault(); toggleFullscreen(); }
      else if (lower === "s") { event.preventDefault(); openPresenter(); }
      else if (lower === "b" || k === ".") { event.preventDefault(); doc.documentElement.classList.toggle("is-blank"); }
      else if (k === "?" || lower === "h") { event.preventDefault(); openOverlay(help); }
      else if (k === "Escape") closeOverlays();
    }

    function handleClick(event) {
      if (event.button !== 0 || event.target.closest(".overlay") || isInteractive(event.target)) return;
      if (String(win.getSelection?.() ?? "").length) return; // selecting text is not a click to advance
      next();
    }

    let touchX = null;
    function handleTouchStart(e) { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }
    function handleTouchEnd(e) {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 50) return;
      e.preventDefault();
      if (dx < 0) next(); else previous();
    }

    if (tocList) {
      tocList.replaceChildren(...slides.map((slide, i) => {
        const li = doc.createElement("li");
        const b = doc.createElement("button");
        b.type = "button";
        b.dataset.slideIndex = String(i);
        b.textContent = `${pad(i + 1)}  ${slide.dataset.title}`;
        b.addEventListener("click", (e) => { e.stopPropagation(); goTo({ slideIndex: i, buildIndex: 0 }); closeOverlays(); });
        li.append(b);
        return li;
      }));
    }
    doc.querySelectorAll("[data-close-overlay]").forEach((b) => b.addEventListener("click", closeOverlays));
    [toc, help].forEach((o) => o?.addEventListener("click", (e) => { if (e.target === o) closeOverlays(); }));

    resizeStage();
    render();
    win.addEventListener("resize", resizeStage);
    win.addEventListener("hashchange", () => { state = stateFromHash(win.location.hash, counts); render(); });
    doc.addEventListener("keydown", handleKeydown);
    doc.addEventListener("click", handleClick);
    doc.addEventListener("touchstart", handleTouchStart, { passive: true });
    doc.addEventListener("touchend", handleTouchEnd, { passive: false });
    // Clicking inside an embedded player moves focus into its cross-origin iframe,
    // where our keys never arrive. Take focus back so the clicker keeps working.
    win.addEventListener("blur", () => {
      win.setTimeout(() => {
        if (doc.activeElement?.tagName === "IFRAME") { doc.activeElement.blur(); win.focus(); stage.focus({ preventScroll: true }); }
      }, 150);
    });
    doc.documentElement.dataset.ready = "true";
    return {
      next, previous, goTo, openPresenter,
      getState: () => ({ ...state }),
      slideCount: slides.length,
      buildCounts: counts.slice(),
      placeholders,
    };
  }

  // Slides generated from data must exist before this runs: put that script above deck.js.
  window.Deck = { createPresentation };
  window.deck = createPresentation(document, window);
})();
