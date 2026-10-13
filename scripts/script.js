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
const currentTheme = () => root.dataset.theme || "dark";

function setTheme(theme) {
  root.dataset.theme = theme;
  try {
    sessionStorage.setItem("theme", theme);
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

// Section pages open on their first item rather than the top of the page,
// unless the link points somewhere specific or the browser is restoring a
// scroll position (back/forward or reload).
if (document.querySelector(".crumbs-band") && !location.hash) {
  const nav = performance.getEntriesByType("navigation")[0];
  const restoring = nav && (nav.type === "back_forward" || nav.type === "reload");
  const first = document.querySelector("main :is(.track-head, article, .job, .edu, .skills)");
  if (first && !restoring && window.scrollY === 0) {
    first.scrollIntoView({ block: "start", behavior: "instant" });
  }
}

// Section bar (section pages). On narrower screens it is a thin bar that
// expands into names on hover (mouse) or first tap (touch); picking a page,
// tapping elsewhere or scrolling folds it back.
const rail = document.querySelector(".section-rail");
if (rail) {
  const narrow = window.matchMedia("(max-width: 1179px)");
  const setRailOpen = (open) => rail.classList.toggle("is-open", open);
  let openedAt = 0;
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
  window.addEventListener(
    "scroll",
    () => {
      if (rail.classList.contains("is-open") && Math.abs(window.scrollY - openedAt) > 40) setRailOpen(false);
    },
    { passive: true }
  );
}

// Home: the header shows @ihashib over the hero, then swaps to the name
// once the big hero name scrolls under it
const heroName = document.querySelector(".hero-name");
if (heroName) {
  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle("past-hero", heroName.getBoundingClientRect().bottom < header.offsetHeight);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
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
  { group: "Go to", icon: "fa-table-cells-large", label: "Overview", keys: "home tiles start", run: go(url("/#overview")) },
  { group: "Go to", icon: "fa-graduation-cap", label: "Education", keys: "university brac bsc cse degree", run: go(url("/education/")) },
  { group: "Go to", icon: "fa-briefcase", label: "Career", keys: "work experience jobs metlife nasir daraz aqualink", run: go(url("/career/")) },
  { group: "Go to", icon: "fa-robot", label: "Robotics", keys: "space iss astrobee kibo jaxa nasa mars rover mongol tori urc irc indian ubiquiti fpv radio ros ip camera awards line following pid self balancing arm inverse kinematics gazebo", run: go(url("/robotics/")) },
  { group: "Go to", icon: "fa-microchip", label: "IoT", keys: "aqualink sensometer hydrometer greenhouse farming firmware stm32 esp32 sensors", run: go(url("/iot/")) },
  { group: "Go to", icon: "fa-cubes", label: "Software", keys: "projects 3pl logistics delivery astrobee iss kibo decoraan marketplace nasir clear frame open daraz purrvelous ecommerce store shop", run: go(url("/projects/")) },
  { group: "Go to", icon: "fa-pen-nib", label: "Writing", keys: "blog posts articles", run: go(url("/blog/")) },
  { group: "Go to", icon: "fa-screwdriver-wrench", label: "Skills", keys: "java spring stack tools embedded firmware stm32 esp32 freertos", run: go(url("/skills/")) },
  { group: "Go to", icon: "fa-paper-plane", label: "Contact", keys: "email message hire talk", run: go(url("/contact/")) },
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

// Video slots: swap the thumbnail for the YouTube player on click, so the
// player only loads when wanted. Without JS the slot stays a plain link.
document.querySelectorAll("[data-youtube]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const frame = document.createElement("iframe");
    frame.className = link.className + " is-playing";
    frame.src = `https://www.youtube-nocookie.com/embed/${link.dataset.youtube}?autoplay=1&rel=0`;
    frame.title = link.getAttribute("aria-label") || "Video";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    link.replaceWith(frame);
  });
});

// Photos: click or tap one to open it full size. Escape, the close button,
// a click anywhere or the back of the dialog closes it.
const mediaImages = document.querySelectorAll(".media img");
if (mediaImages.length) {
  const box = document.createElement("dialog");
  box.className = "lightbox";
  box.setAttribute("aria-label", "Photo");
  box.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close photo"><i class="fas fa-xmark" aria-hidden="true"></i></button><img alt="" /><p></p>';
  document.body.append(box);
  const big = box.querySelector("img");
  const caption = box.querySelector("p");
  let opener = null;

  const open = (img) => {
    opener = img;
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    caption.textContent = img.alt;
    box.showModal();
  };
  box.addEventListener("click", () => box.close());
  box.addEventListener("close", () => {
    big.removeAttribute("src");
    opener?.focus();
  });

  mediaImages.forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", `View larger: ${img.alt}`);
    img.addEventListener("click", () => open(img));
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(img);
      }
    });
  });
}

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
