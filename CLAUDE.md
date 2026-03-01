# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio and resume website for ImL1s (Sam), a senior mobile developer. Static site hosted on GitHub Pages with no build system — edit HTML/CSS/JS directly and push to `main` to deploy.

## Development

No build tools, package managers, or CI/CD pipelines. The site is pure HTML/CSS/JavaScript.

- **Deploy**: `git push origin main` — GitHub Pages auto-deploys
- **Local preview**: Open `index.html` or `resume.html` directly in a browser, or use `python3 -m http.server 8000`
- **Jekyll disabled**: `.nojekyll` file present — do not remove

## Architecture

### Core Files

| File | Purpose | Lines |
|------|---------|-------|
| `index.html` | Main portfolio page (hero, projects, skills, services, contact) | ~2600 |
| `resume.html` | Detailed resume/CV page (work experience, education, skills) | ~1800 |
| `js/i18n.js` | Internationalization system with all translations | ~1150 |
| `404.html` | Custom 404 page | small |

### CSS Architecture

All styles are **embedded in `<style>` tags** within each HTML file (no external CSS files). Key patterns:

- CSS custom properties on `:root` for theming: `--bg-primary`, `--text-primary`, `--accent-blue`, `--gradient-1`, etc.
- Dark theme only (no light mode toggle)
- Responsive design via Flexbox and media queries
- Fixed top navbar with smooth scroll navigation

### i18n System (`js/i18n.js`)

The internationalization system supports 4 languages: `zh-TW` (default), `zh-CN`, `en`, `ja`.

**How it works:**
1. HTML elements use `data-i18n="key.path"` attributes for text content
2. `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-alt` for other attributes
3. `applyTranslations()` walks the DOM and replaces text from the `translations` object
4. Language preference persisted in `localStorage` key `"preferredLanguage"`

**Translation key namespaces:**
- `nav.*` — Navigation bar
- `hero.*` — Hero section and stats
- `project.*` — Featured projects
- `skills.*` — Tech stack section
- `services.*` — Services offered
- `resume.exp.*` — Work experience entries (e.g., `resume.exp.heytok.h1`, `resume.exp.heytok.desc`)
- `resume.skills.*`, `resume.edu.*`, `resume.lang.*` — Resume subsections

**When adding/editing content:**
- Always update ALL 4 language objects in `js/i18n.js` when changing translatable text
- Add `data-i18n="namespace.key"` to new HTML elements
- Resume experience keys follow pattern: `resume.exp.<project>.{h1,h2,h3,h4,desc}` where h1=company, h2=role, h3=period, h4=tech stack, desc=description

### SEO Configuration

Both HTML files include comprehensive SEO:
- Open Graph + Twitter Card meta tags
- `hreflang` alternate links for all 4 languages
- JSON-LD structured data (Person, WebSite, ProfilePage, BreadcrumbList, SoftwareApplication)
- `sitemap.xml` and `robots.txt` at root

When editing meta content or page titles, update OG tags and structured data to match.

### Sub-project Pages

Root contains privacy policies, terms, and support pages for 30+ published apps (pattern: `<app>-privacy.html`, `<app>-terms.html`, `<app>-support.html`). These are standalone HTML files with no shared template.

Subdirectories (`bitfinex-lending-platform/`, `car-log-plus/`, `kashvox/`, `moltx/`, `tidyup/`, `tron-wallet/`) contain app-specific landing pages or web apps.

## Common Tasks

### Add a new project to portfolio
1. Add HTML card in `index.html` inside the projects grid section
2. Add `data-i18n` attributes for translatable text
3. Add translation keys to all 4 language objects in `js/i18n.js`
4. Add project screenshot to `assets/screenshots/`

### Add/edit work experience in resume
1. Edit the experience section in `resume.html`
2. Add/update `data-i18n` keys with `resume.exp.<project>.*` pattern
3. Update all 4 languages in `js/i18n.js` — entries use `h1` (company), `h2` (role), `h3` (period), `h4` (tech stack), `desc` (description)

### Add a new app's legal pages
Create standalone HTML files at root: `<app>-privacy.html`, `<app>-terms.html`, `<app>-support.html`. No shared template — copy from an existing app's pages and modify.
