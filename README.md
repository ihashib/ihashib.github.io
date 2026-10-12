# ihashib.github.io

Source for [ihashib.github.io](https://ihashib.github.io): the portfolio and blog of Md Hashibul Islam, software engineer.

Built with [Jekyll](https://jekyllrb.com/), which GitHub Pages builds automatically on every push to `main`. There's no separate server, database or CI to maintain.

## What's here

```
_config.yml          Site settings (title, URL, plugins, permalinks)
_layouts/            default.html (shared shell), post.html (blog post)
_includes/           head, header, footer, command palette, post card
index.html           Home page: hero, tiles, then every section
blog/index.html      Blog listing with search and tag filter
_posts/              Published blog posts (Markdown)
_drafts/             Unpublished drafts
search.json          Post index used by the Ctrl/⌘ K palette
styles/style.css     All styles, light and dark themes
scripts/script.js    Theme, palette, nav, blog filter, contact form
cv/                  Downloadable CV
```

Features: light/dark theme (follows the system, with a manual toggle), a Ctrl/⌘ K command palette, a blog with tags, search, reading time, an RSS feed (`/blog/feed.xml`), a sitemap and SEO/Open Graph tags.

## Writing a post

1. Create `_posts/YYYY-MM-DD-your-slug.md`:

   ```markdown
   ---
   title: "Your title"
   description: "One or two sentences shown on cards and in search results."
   tags: [java, spring-boot]
   ---

   Your post in Markdown. Fenced code blocks get syntax highlighting.
   ```

2. Commit and push. The post appears at `/blog/your-slug/` in a minute or two.

Work in progress lives in `_drafts/` (no date in the filename) and is not published.

## Run locally

With Docker (no Ruby install needed):

```bash
docker run --rm -it -p 4000:4000 -v "$PWD":/srv/site -w /srv/site \
  -e BUNDLE_PATH=/srv/site/vendor/bundle ruby:3.3 \
  sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0 --drafts --livereload"
```

Or with Ruby installed: `bundle install && bundle exec jekyll serve --drafts`.

Then open http://localhost:4000.

Previewing through code-server (VS Code in the browser)? Its `/proxy/` path breaks the site's absolute links, so serve under its `/absproxy/` path instead: replace `--livereload` with `--baseurl /absproxy/4000` and open `https://<your-code-server>/absproxy/4000/`.

## Contact form

The form posts to [Formspree](https://formspree.io/). Change the form `action` in `index.html` to use a different endpoint.
