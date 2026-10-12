const SITE = window.SITE || { base: "", email: "ihashib2@gmail.com" };
const url = (path) => SITE.base + path;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Show the right shortcut key for the platform
if (isMac) {
  document.querySelectorAll(".kbd-hint, .kbd-mod").forEach((el) => {
    el.textContent = el.textContent.replace("Ctrl", "⌘");
  });
  document.querySelectorAll(".palette-open").forEach((el) => {
    el.setAttribute("aria-label", "Search and jump (⌘K)");
  });
}

// Theme
const root = document.documentElement;
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const currentTheme = () => root.dataset.theme || (darkQuery.matches ? "dark" : "light");

function setTheme(theme) {
  root.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
}
function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}
document.querySelector(".theme-toggle").addEventListener("click", toggleTheme);

// Mobile navigation
const toggle = document.querySelector(".nav-toggle");
const links = document.getElementById("nav-links");

function setMenu(open) {
  toggle.setAttribute("aria-expanded", String(open));
  links.classList.toggle("open", open);
}
toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// Header border once the page scrolls, and reading progress on posts
const header = document.querySelector(".site-header");
const progress = document.querySelector(".read-progress");
const isPost = document.body.classList.contains("is-post");

function onScroll() {
  header.classList.toggle("scrolled", window.scrollY > 8);
  if (isPost) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  }
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Reveal on scroll
const revealEls = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window && !reduceMotion) {
  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => revealer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}

// Highlight the nav link for the section in view (home page)
if (document.body.classList.contains("is-home") && "IntersectionObserver" in window) {
  const navMap = new Map();
  links.querySelectorAll("a[data-section]").forEach((a) => navMap.set(a.dataset.section, a));
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navMap.forEach((a) => a.classList.remove("is-active"));
        const active = navMap.get(entry.target.id);
        if (active) active.classList.add("is-active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  // Watch every section, including ones with no nav link (hero, education,
  // skills), so the highlight clears when you scroll back to them.
  document.querySelectorAll("main > section").forEach((s) => spy.observe(s));
}

// Tiles and the section list: a tile (or a name in the list) glides to its
// section and becomes a browser history step, so Back returns you. Tiles for
// sections you've already read get a small dot.
const tilesSection = document.getElementById("overview");
if (tilesSection) {
  const behavior = reduceMotion ? "auto" : "smooth";
  const tileFor = (id) => tilesSection.querySelector(`.tile[href="#${id}"]`);
  const rail = document.querySelector(".section-rail");
  const railLinks = rail.querySelectorAll("a[data-rail]");
  let current = null;

  let visited = [];
  try {
    visited = JSON.parse(sessionStorage.getItem("visitedSections") || "[]");
  } catch (e) {}
  const markVisited = (id) => {
    const tile = tileFor(id);
    if (!tile) return;
    tile.classList.add("is-visited");
    if (!visited.includes(id)) {
      visited.push(id);
      try {
        sessionStorage.setItem("visitedSections", JSON.stringify(visited));
      } catch (e) {}
    }
  };
  visited.forEach(markVisited);

  function setActive(id) {
    railLinks.forEach((a) => {
      if (a.dataset.rail === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  // Move focus only when navigating by keyboard; clicks and taps leave none
  let usingKeyboard = false;
  document.addEventListener("keydown", () => (usingKeyboard = true), true);
  document.addEventListener("pointerdown", () => (usingKeyboard = false), true);

  function goTo(id) {
    const target = document.getElementById(id);
    if (!target) return;
    history.pushState({ section: id }, "", "#" + id);
    if (id === "overview") {
      // Land on the tile you came from, so you keep your place
      const tile = current && tileFor(current);
      (tile || tilesSection).scrollIntoView({ behavior, block: tile ? "center" : "start" });
      if (tile && usingKeyboard) tile.focus({ preventScroll: true });
      return;
    }
    target.scrollIntoView({ behavior, block: "start" });
    const heading = target.querySelector("h2");
    if (heading && usingKeyboard) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    markVisited(id);
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (link.closest(".tiles") || link.closest(".section-rail") || link.classList.contains("to-overview")) {
      e.preventDefault();
      rail.classList.remove("is-open");
      goTo(link.getAttribute("href").slice(1));
    }
  });

  // Narrower screens: a thin bar of section segments. Hovering (mouse) or
  // tapping (touch) expands it into names; choosing one, tapping elsewhere
  // or scrolling folds it back.
  const narrow = window.matchMedia("(max-width: 1179px)");
  const setRailOpen = (open) => rail.classList.toggle("is-open", open);
  rail.addEventListener("pointerenter", (e) => {
    if (narrow.matches && e.pointerType === "mouse") setRailOpen(true);
  });
  rail.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") setRailOpen(false);
  });
  // A first tap on the collapsed bar only expands it
  rail.addEventListener(
    "click",
    (e) => {
      if (narrow.matches && !rail.classList.contains("is-open")) {
        e.preventDefault();
        e.stopPropagation();
        setRailOpen(true);
        openedAt = window.scrollY;
      }
    },
    true
  );
  rail.addEventListener("focusin", () => narrow.matches && setRailOpen(true));
  rail.addEventListener("focusout", (e) => {
    if (!rail.contains(e.relatedTarget)) setRailOpen(false);
  });
  document.addEventListener("click", (e) => {
    if (!rail.contains(e.target)) setRailOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && rail.classList.contains("is-open")) setRailOpen(false);
  });
  let openedAt = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (rail.classList.contains("is-open") && Math.abs(window.scrollY - openedAt) > 40) setRailOpen(false);
    },
    { passive: true }
  );

  if ("IntersectionObserver" in window) {
    // Which section is the reader in? A section counts as read once they
    // stay on it for a moment, not when it scrolls past on the way.
    let dwell;
    const sectionSpy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          setActive(id);
          if (id === "overview") return;
          current = id;
          clearTimeout(dwell);
          dwell = setTimeout(() => current === id && markVisited(id), 1500);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    document.querySelectorAll("main > section[id]").forEach((sec) => sectionSpy.observe(sec));

  }

  // The section bar appears once the first screen is scrolled away, and the
  // floating "Overview" button once the tiles are. Checked on every scroll
  // (not by intersection), so jumping straight past them still works.
  const toOverview = document.querySelector(".to-overview");
  const hero = document.querySelector(".hero");
  let ticking = false;
  const heroName = document.querySelector(".hero-name");
  const updateFloating = () => {
    ticking = false;
    // Header name appears once the big hero name has scrolled under the header
    header.classList.toggle("past-hero", heroName.getBoundingClientRect().bottom < header.offsetHeight);
    const railShown = hero.getBoundingClientRect().bottom < 0;
    rail.classList.toggle("is-shown", railShown);
    if (!railShown) rail.classList.remove("is-open");
    toOverview.classList.toggle("is-shown", tilesSection.getBoundingClientRect().bottom < 0);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateFloating);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", updateFloating);
  updateFloating();
}


// Copy to clipboard
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

document.querySelectorAll(".copy-btn").forEach((btn) => {
  const label = btn.querySelector(".copy-label");
  btn.addEventListener("click", async () => {
    const ok = await copyText(btn.dataset.copy);
    label.textContent = ok ? "Copied" : "Copy failed";
    btn.classList.toggle("is-done", ok);
    setTimeout(() => {
      label.textContent = "Copy";
      btn.classList.remove("is-done");
    }, 1800);
  });
});

// Blog posts: copy buttons on code blocks and anchor links on headings
document.querySelectorAll(".prose div.highlighter-rouge").forEach((block) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "code-copy";
  btn.textContent = "Copy";
  btn.addEventListener("click", async () => {
    const ok = await copyText(block.querySelector("pre").innerText);
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });
  block.appendChild(btn);
});

document.querySelectorAll(".prose h2[id], .prose h3[id]").forEach((h) => {
  const a = document.createElement("a");
  a.className = "heading-anchor";
  a.href = "#" + h.id;
  a.textContent = "#";
  a.setAttribute("aria-label", "Link to this section");
  h.prepend(a);
});

// Blog index: search and tag filter
const blogTools = document.querySelector(".blog-tools");
if (blogTools) {
  const search = blogTools.querySelector("input");
  const tagButtons = blogTools.querySelectorAll("button[data-tag]");
  const cards = document.querySelectorAll(".post-list .post-card");
  const empty = document.querySelector(".blog-empty");
  let activeTag = (new URLSearchParams(location.search).get("tag") || "").toLowerCase();

  function applyFilter() {
    const terms = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    cards.forEach((card) => {
      const tags = card.dataset.tags ? card.dataset.tags.split("|") : [];
      const matchTag = !activeTag || tags.includes(activeTag);
      const matchText = terms.every((t) => card.dataset.search.includes(t));
      const visible = matchTag && matchText;
      card.hidden = !visible;
      if (visible) {
        card.classList.add("in");
        shown++;
      }
    });
    empty.hidden = shown > 0;
    tagButtons.forEach((b) => {
      const on = b.dataset.tag === activeTag;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  tagButtons.forEach((b) =>
    b.addEventListener("click", () => {
      activeTag = b.dataset.tag;
      const params = new URLSearchParams(location.search);
      if (activeTag) params.set("tag", activeTag);
      else params.delete("tag");
      const qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
      applyFilter();
    })
  );
  search.addEventListener("input", applyFilter);
  if (activeTag) applyFilter();
}

// Command palette
const palette = document.querySelector(".palette");
const paletteInput = palette.querySelector(".palette-input");
const paletteList = palette.querySelector(".palette-list");
let posts = null;
let results = [];
let selected = 0;

const go = (href) => () => {
  location.href = href;
};

const staticCommands = [
  { group: "Go to", icon: "fa-briefcase", label: "Career", keys: "work experience jobs metlife nasir daraz aqualink", run: go(url("/#career")) },
  { group: "Go to", icon: "fa-robot", label: "Robotics", keys: "space iss astrobee kibo jaxa nasa mars rover mongol tori urc irc ubiquiti fpv radio ros ip camera awards line following pid self balancing arm inverse kinematics gazebo", run: go(url("/#robotics")) },
  { group: "Go to", icon: "fa-microchip", label: "IoT", keys: "aqualink sensometer hydrometer greenhouse farming firmware stm32 esp32 sensors", run: go(url("/#iot")) },
  { group: "Go to", icon: "fa-cubes", label: "Projects", keys: "decoraan marketplace nasir clear frame open daraz purrvelous", run: go(url("/#projects")) },
  { group: "Go to", icon: "fa-pen-nib", label: "Writing", keys: "blog posts articles", run: go(url("/blog/")) },
  { group: "Go to", icon: "fa-graduation-cap", label: "Education", keys: "university brac bsc cse degree", run: go(url("/#education")) },
  { group: "Go to", icon: "fa-screwdriver-wrench", label: "Skills", keys: "java spring stack tools embedded firmware stm32 esp32 freertos", run: go(url("/#skills")) },
  { group: "Go to", icon: "fa-paper-plane", label: "Contact", keys: "email message hire talk", run: go(url("/#contact")) },
  { group: "Actions", icon: "fa-circle-half-stroke", label: "Switch colour theme", keys: "dark light mode", run: toggleTheme },
  {
    group: "Actions",
    icon: "fa-copy",
    label: "Copy email address",
    hint: SITE.email,
    keys: "mail",
    run: () => copyText(SITE.email),
  },
  { group: "Actions", icon: "fa-file-arrow-down", label: "Download CV", keys: "resume pdf", run: go(url("/cv/Md-Hashibul-Islam-CV.pdf")) },
  { group: "Elsewhere", icon: "fa-github fab", label: "GitHub", keys: "code repos", run: () => window.open("https://github.com/ihashib", "_blank", "noopener") },
  { group: "Elsewhere", icon: "fa-linkedin-in fab", label: "LinkedIn", keys: "profile", run: () => window.open("https://linkedin.com/in/ihashib", "_blank", "noopener") },
  { group: "Elsewhere", icon: "fa-rss", label: "RSS feed", keys: "subscribe blog", run: go(url("/blog/feed.xml")) },
];

async function loadPosts() {
  if (posts) return;
  try {
    const res = await fetch(url("/search.json"));
    const data = await res.json();
    posts = data.map((p) => ({
      group: "Posts",
      icon: "fa-file-lines",
      label: p.title,
      hint: p.date,
      keys: [p.description, (p.tags || []).join(" ")].join(" "),
      run: go(p.url),
    }));
  } catch (e) {
    posts = [];
  }
}

function filterCommands(query) {
  const all = staticCommands.concat(posts || []);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return all;
  return all
    .map((c) => {
      const label = c.label.toLowerCase();
      const hay = label + " " + c.keys.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return null;
      const score = label.startsWith(terms[0]) ? 0 : label.includes(terms[0]) ? 1 : 2;
      return { c, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.c);
}

function renderPalette() {
  results = filterCommands(paletteInput.value);
  selected = Math.min(selected, Math.max(results.length - 1, 0));
  paletteList.innerHTML = "";

  if (!results.length) {
    const li = document.createElement("li");
    li.className = "palette-none";
    li.textContent = "Nothing matches. Try “career”, “blog” or “email”.";
    paletteList.appendChild(li);
    paletteInput.removeAttribute("aria-activedescendant");
    return;
  }

  let lastGroup = null;
  results.forEach((cmd, i) => {
    if (cmd.group !== lastGroup && !paletteInput.value.trim()) {
      const g = document.createElement("li");
      g.className = "palette-group";
      g.setAttribute("role", "presentation");
      g.textContent = cmd.group;
      paletteList.appendChild(g);
      lastGroup = cmd.group;
    }
    const li = document.createElement("li");
    li.className = "palette-item";
    li.id = "palette-opt-" + i;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(i === selected));

    const icon = document.createElement("i");
    icon.className = (cmd.icon.includes("fab") ? "" : "fas ") + cmd.icon;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = cmd.label;
    li.append(icon, text);
    if (cmd.hint) {
      const hint = document.createElement("small");
      hint.textContent = cmd.hint;
      li.appendChild(hint);
    }

    li.addEventListener("mousemove", () => {
      if (selected !== i) {
        selected = i;
        updateSelection();
      }
    });
    li.addEventListener("click", () => runCommand(i));
    paletteList.appendChild(li);
  });
  updateSelection();
}

function updateSelection() {
  paletteList.querySelectorAll(".palette-item").forEach((li) => {
    const on = li.id === "palette-opt-" + selected;
    li.setAttribute("aria-selected", String(on));
    if (on) li.scrollIntoView({ block: "nearest" });
  });
  paletteInput.setAttribute("aria-activedescendant", "palette-opt-" + selected);
}

function runCommand(i) {
  const cmd = results[i];
  if (!cmd) return;
  palette.close();
  cmd.run();
}

async function openPalette() {
  if (palette.open) return;
  setMenu(false);
  paletteInput.value = "";
  selected = 0;
  renderPalette();
  palette.showModal();
  paletteInput.focus();
  if (!posts) {
    await loadPosts();
    if (palette.open) renderPalette();
  }
}

document.querySelectorAll(".palette-open").forEach((b) => b.addEventListener("click", openPalette));
paletteInput.addEventListener("input", () => {
  selected = 0;
  renderPalette();
});
paletteInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!results.length) return;
    selected = (selected + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
    updateSelection();
  } else if (e.key === "Enter") {
    e.preventDefault();
    runCommand(selected);
  }
});
// Close when clicking the backdrop
palette.addEventListener("click", (e) => {
  if (e.target === palette) palette.close();
});

document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    palette.open ? palette.close() : openPalette();
  } else if (e.key === "/" && !typing && !palette.open) {
    e.preventDefault();
    openPalette();
  } else if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    toggle.focus();
  }
});

// Contact form (Formspree)
const form = document.querySelector(".contact-form");
if (form) {
  const statusEl = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');

  const setStatus = (message, type) => {
    statusEl.textContent = message;
    statusEl.className = "form-status" + (type ? " is-" + type : "");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fields = {
      name: form.elements.name,
      email: form.elements.email,
      message: form.elements.message,
    };
    Object.values(fields).forEach((f) => f.removeAttribute("aria-invalid"));

    const empty = Object.values(fields).filter((f) => !f.value.trim());
    if (empty.length) {
      empty.forEach((f) => f.setAttribute("aria-invalid", "true"));
      empty[0].focus();
      setStatus("Fill in your name, email and message to send.", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim())) {
      fields.email.setAttribute("aria-invalid", "true");
      fields.email.focus();
      setStatus("Enter an email address like name@example.com.", "error");
      return;
    }

    const label = submitBtn.innerHTML;
    submitBtn.textContent = "Sending…";
    submitBtn.disabled = true;
    setStatus("");

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        setStatus(`Message sent. Thanks, ${fields.name.value.trim()}, I'll reply by email.`, "success");
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.errors
          ? data.errors.map((err) => err.message).join(", ")
          : `The message didn't send. Try again, or email ${SITE.email}.`;
        setStatus(msg, "error");
      }
    } catch {
      setStatus(`The message didn't send. Check your connection, or email ${SITE.email}.`, "error");
    } finally {
      submitBtn.innerHTML = label;
      submitBtn.disabled = false;
    }
  });
}
