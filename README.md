# VERIFY Blog - Static Site

Blog hosted on GitHub Pages at [blog.verify24.pl](https://blog.verify24.pl).

## Automated Publishing

Blog posts are generated automatically **2x per week** (Monday + Thursday at 08:00 UTC) via GitHub Actions + Claude API.

### How it works

1. GitHub Actions cron triggers `node scripts/generate-post.js`
2. Script picks next pending topic from `data/topics.json`
3. Claude API (Sonnet) generates the article in JSON format
4. Script creates HTML file, updates `index.html` and `sitemap.xml`
5. Bot commits and pushes → GitHub Pages auto-deploys

### Setup

1. Add `ANTHROPIC_API_KEY` to repository Settings → Secrets → Actions
2. Enable GitHub Pages (Settings → Pages → Source: Deploy from branch `main`)
3. Custom domain: `blog.verify24.pl` (CNAME file included)

### Manual trigger

Go to Actions → "Generate & Publish Blog Post" → Run workflow

### Local test

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-post.js
```

## Files Structure

- `index.html` — Blog listing page
- `[slug].html` — Individual blog posts
- `sitemap.xml` — SEO sitemap
- `robots.txt` — Search engine instructions
- `CNAME` — GitHub Pages custom domain
- `data/topics.json` — Topic pool with status tracking
- `scripts/generate-post.js` — Post generator (Claude API)
- `scripts/templates.js` — HTML templates
- `.github/workflows/publish-post.yml` — Automation workflow
