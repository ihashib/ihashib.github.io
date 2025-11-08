# Md. Hashibul Islam — Personal Portfolio Website

Hello — I'm Md. Hashibul Islam, a software engineer building backend systems, microservices, and practical tooling for web and embedded projects. This repository contains the source for my personal portfolio website (static HTML/CSS), which highlights my skills, experience, projects, and ways to get in touch.

---

## Quick preview

Open `index.html` in your browser to view the site locally (no build step required). The site is fully static and purposefully lightweight so it works well on low-resource machines and can be deployed to GitHub Pages, Netlify, or any static host.

---

## What’s in this repo

```
/ (project root)
├─ index.html               # Main site
├─ styles/
│  └─ style.css             # All styling and variables
├─ scripts/
│  └─ script.js             # Small interactivity (nav toggle, etc.)
├─ images/
│  └─ profile.jpg           # Profile photo used on hero
├─ cv/
│  └─ Md-Hashibul-Islam-CV.pdf
└─ README.md                # This file
```

---

## Purpose & goals

This site is a clean, readable résumé-style portfolio with three practical goals:

1. Present work and accomplishments clearly for technical reviewers and hiring managers.
2. Make it easy for recruiters and collaborators to contact me.
3. Be easily forked or adapted by other engineers — minimal dependencies, accessible markup, and clear styles.

The layout emphasizes readability: a hero area, skill sections, a timeline-style experience section, and project cards. The design uses a calm green-teal palette, clear typography (Poppins), and consistent spacing for legibility.

---

## Key features

- **Static and fast**: plain HTML/CSS with a small JS file for UX niceties.
- **Responsive**: mobile-first tweaks collapse the timeline and stack content on small screens.
- **Readable experience timeline**: big content blocks, clear date labels, and separated project modules for each role.
- **Projects & highlights**: concise cards with tech stacks and links to sources or demos.
- **Downloadable CV**: one-click PDF download in the header and contact section.
- **Easy customization**: color variables and component classes make theme and layout updates straightforward.

---

## Technologies used

- Plain HTML5 + CSS3 (custom variables for theme)
- Minimal vanilla JavaScript (nav toggle & small behaviors)
- Google Fonts (Poppins)
- Font Awesome for icons (CDN)

No build tooling — everything runs in the browser immediately.

---

## How to run locally

1. Clone or download the repository.
2. Make sure the folder structure is preserved (styles, scripts, images, cv).
3. Open `index.html` in a browser (double-click, or `Open File…` from the browser menu).

If you prefer a local server (useful for testing relative asset paths), you can run a simple server:

- With Python 3:

```bash
# from the project root
python -m http.server 8000
# then visit http://localhost:8000
```

- With Node (if you have `http-server`):

```bash
npx http-server -c-1
```

---

## Customization notes (quick)

- Colors: edit `:root` variables in `styles/style.css` (`--primary-color`, `--secondary-color`, etc.).
- Fonts: swap the Google Fonts link in `index.html` for any other family and adjust font sizes in the stylesheet.
- Timeline width / readability: tweak `.timeline` or `.container` `max-width` and `.timeline-item` widths to increase line length for better reading on wide screens. (The stylesheet contains responsive rules for smaller screens.)
- Add sections: replicate the markup pattern used in `#projects` or `#education` and follow the existing utility class patterns for spacing and cards.

---

## Deployment tips

- **GitHub Pages**: push the repository to a GitHub repo and enable GitHub Pages from the repository settings (use the `main` branch root).
- **Netlify**: drag-and-drop the repo folder to Netlify Drop or connect the repo and use the default build settings (no build command required).
- **Vercel**: add the project and set the output directory to the repo root (static).

Because the site is static, CDN caching and HTTPS come for free on most static hosts — no backend or server config needed.

---

## Accessibility & performance

- Uses semantic tags (`section`, headings, lists) for structure and clarity.
- Avoids heavy images and large third-party libraries for quick load times.
- Contrast and spacing chosen to help scanability; feel free to run Lighthouse and tweak font sizes for your target audience.

---

## Credits & acknowledgements

- Icons: Font Awesome (free CDN).
- Fonts: Google Fonts (Poppins).
- Inspiration: personal portfolio patterns common in developer resumes — clarity and honesty first.

---

## License

MIT License — feel free to reuse and adapt this code. If you fork the repo, a small `Attribution` line in the footer or README is appreciated but not required.

---

## Contact

- Email: ihashib2@gmail.com
- LinkedIn: https://linkedin.com/in/ihashib
- GitHub: https://github.com/ihashib

If you want me to tailor the README tone (shorter, more formal, or very concise) or include a short changelog and contribution guidelines, say the word and I’ll prepare it.
