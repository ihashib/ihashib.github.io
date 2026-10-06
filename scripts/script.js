// Mobile navigation
const toggle = document.querySelector(".nav-toggle");
const links = document.getElementById("nav-links");

toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  links.classList.toggle("open", !open);
});

links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("open");
  })
);

// Header border once the page scrolls
const header = document.querySelector(".site-header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Contact form (Formspree)
const form = document.querySelector(".contact-form");
const statusEl = form.querySelector(".form-status");
const submitBtn = form.querySelector('button[type="submit"]');

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "form-status" + (type ? " is-" + type : "");
}

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

  const label = submitBtn.textContent;
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
      setStatus(
        `Message sent. Thanks, ${fields.name.value.trim()}, I'll reply by email.`,
        "success"
      );
      form.reset();
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = data.errors
        ? data.errors.map((err) => err.message).join(", ")
        : "The message didn't send. Try again, or email ihashib2@gmail.com.";
      setStatus(msg, "error");
    }
  } catch {
    setStatus(
      "The message didn't send. Check your connection, or email ihashib2@gmail.com.",
      "error"
    );
  } finally {
    submitBtn.textContent = label;
    submitBtn.disabled = false;
  }
});
