// Navigation functionality
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navMenu.classList.toggle("active");
});

document.querySelectorAll(".nav-link").forEach((n) =>
  n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
  })
);

// Navbar scroll effect
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar");
  if (window.scrollY > 100) {
    navbar.style.background = "rgba(255, 255, 255, 0.98)";
    navbar.style.boxShadow = "0 2px 20px rgba(0, 0, 0, 0.1)";
  } else {
    navbar.style.background = "rgba(255, 255, 255, 0.95)";
    navbar.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
  }
});

// Animation on scroll
function animateOnScroll() {
  const elements = document.querySelectorAll(
    ".skill-category, .project-card, .timeline-item, .education-item, .award-item"
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((element) => {
    element.style.opacity = 0;
    element.style.transform = "translateY(20px)";
    element.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    observer.observe(element);
  });
}

// Formspree Form Submission
const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get form values
    const nameInput = contactForm.querySelector('input[name="name"]');
    const emailInput = contactForm.querySelector('input[name="email"]');
    const messageInput = contactForm.querySelector('textarea[name="message"]');
    const submitButton = contactForm.querySelector('button[type="submit"]');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    // Validation
    if (!name || !email || !message) {
      showFormMessage("Please fill in all fields", "error");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFormMessage("Please enter a valid email address", "error");
      return;
    }

    // Show loading state
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = "Sending...";
    submitButton.disabled = true;

    try {
      const formData = new FormData(contactForm);

      const response = await fetch(contactForm.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        showFormMessage(
          `Thank you for your message, ${name}! I will get back to you soon.`,
          "success"
        );
        contactForm.reset();
      } else {
        const data = await response.json();
        if (data.errors) {
          showFormMessage(
            data.errors.map((error) => error.message).join(", "),
            "error"
          );
        } else {
          throw new Error("Form submission failed");
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      showFormMessage(
        "Oops! Something went wrong. Please try again or email me directly at ihashib2@gmail.com",
        "error"
      );
    } finally {
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
}

// Helper function to show form messages
function showFormMessage(message, type) {
  // Remove existing message if any
  const existingMessage = document.getElementById("form-status");
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message element
  const messageElement = document.createElement("p");
  messageElement.id = "form-status";
  messageElement.textContent = message;
  messageElement.style.marginTop = "15px";
  messageElement.style.padding = "12px";
  messageElement.style.borderRadius = "5px";
  messageElement.style.textAlign = "center";
  messageElement.style.fontWeight = "500";
  messageElement.style.animation = "fadeIn 0.3s ease";

  if (type === "success") {
    messageElement.style.backgroundColor = "#d4edda";
    messageElement.style.color = "#155724";
    messageElement.style.border = "1px solid #c3e6cb";
  } else {
    messageElement.style.backgroundColor = "#f8d7da";
    messageElement.style.color = "#721c24";
    messageElement.style.border = "1px solid #f5c6cb";
  }

  // Insert after the submit button
  const submitButton = contactForm.querySelector('button[type="submit"]');
  submitButton.parentNode.insertBefore(
    messageElement,
    submitButton.nextSibling
  );

  // Auto-remove success messages after 5 seconds
  if (type === "success") {
    setTimeout(() => {
      messageElement.style.animation = "fadeOut 0.3s ease";
      setTimeout(() => messageElement.remove(), 300);
    }, 5000);
  }
}

// Initialize animations when page loads
document.addEventListener("DOMContentLoaded", () => {
  animateOnScroll();

  // Add current year to footer
  const year = new Date().getFullYear();
  const footerText = document.querySelector(".footer p");
  if (footerText) {
    footerText.innerHTML = `&copy; ${year} Md. Hashibul Islam. All Rights Reserved.`;
  }
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});
