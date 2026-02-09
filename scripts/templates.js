// templates.js — HTML templates for Verify24 blog
// Replicates exact style from existing article (jak-sprawdzic-kontrahenta-po-nip.html)

const SITE_URL = 'https://blog.verify24.pl';
const MAIN_URL = 'https://verify24.pl';

const CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    header {
      background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
      color: white;
      padding: 60px 20px;
      text-align: center;
      margin-bottom: 40px;
    }
    h1 { font-size: 42px; font-weight: bold; margin-bottom: 16px; }
    .subtitle { font-size: 18px; opacity: 0.9; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .cta-box {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #1e293b;
      padding: 30px;
      border-radius: 12px;
      margin: 40px 0;
      text-align: center;
    }
    .cta-box h3 { margin-bottom: 12px; font-size: 24px; }
    .cta-box p { margin-bottom: 20px; opacity: 0.9; }
    .cta-button {
      display: inline-block;
      background: white;
      color: #1e40af;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: bold;
      text-decoration: none;
      transition: transform 0.2s;
    }
    .cta-button:hover { transform: scale(1.05); text-decoration: none; }
    footer {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      margin-top: 60px;
    }`;

const CTA_BOX = `
  <div class="cta-box">
    <h3>Sprawdź kontrahenta po NIP w kilka sekund</h3>
    <p>Raport PDF + scoring ryzyka 0-100 + dane finansowe z KRS</p>
    <a href="${MAIN_URL}/verify" class="cta-button">Sprawdź teraz →</a>
  </div>`;

function formatDate(date) {
  const d = date || new Date();
  const day = d.getDate();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateISO(date) {
  return (date || new Date()).toISOString();
}

function formatDateShort(date) {
  return (date || new Date()).toISOString().split('T')[0];
}

/**
 * Builds a full article HTML page.
 * @param {object} params
 * @param {string} params.slug - URL slug (without .html)
 * @param {string} params.title - Article title
 * @param {string} params.metaDescription - Meta description
 * @param {string} params.articleHtml - Inner HTML of article body (h2, p, ul, etc.)
 * @param {Date} [params.date] - Publication date
 * @returns {string} Full HTML page
 */
function buildArticlePage({ slug, title, metaDescription, articleHtml, date }) {
  const pubDate = date || new Date();
  const url = `${SITE_URL}/${slug}.html`;
  const displayDate = formatDate(pubDate);
  const isoDate = formatDateISO(pubDate);

  // Insert CTA box roughly in the middle of the article
  const processedHtml = insertCtaInMiddle(articleHtml);

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | VERIFY</title>
  <meta name="description" content="${escapeAttr(metaDescription)}">
  <link rel="canonical" href="${url}">

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeAttr(title)} | VERIFY">
  <meta property="og:description" content="${escapeAttr(metaDescription)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="article">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(title)} | VERIFY">
  <meta name="twitter:description" content="${escapeAttr(metaDescription)}">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="${MAIN_URL}/favicon.png">

  <style>${CSS}
    article h2 { font-size: 28px; margin: 32px 0 16px; color: #1e293b; }
    article h3 { font-size: 22px; margin: 24px 0 12px; color: #334155; }
    article p { margin-bottom: 16px; color: #475569; }
    article ul, article ol { margin: 0 0 16px 24px; color: #475569; }
    article li { margin-bottom: 8px; }
    article strong { color: #1e293b; }
  </style>
</head>
<body>

  <header>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${displayDate}</p>
  </header>

  <div class="container">
    <nav style="margin-bottom: 24px;">
      <a href="${SITE_URL}">← Wszystkie poradniki</a>
    </nav>

    <article style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
${processedHtml}
    </article>

${CTA_BOX}
  </div>

  <!-- Schema.org Article -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(title)},
    "description": ${JSON.stringify(metaDescription)},
    "datePublished": "${isoDate}",
    "dateModified": "${isoDate}",
    "author": {
      "@type": "Organization",
      "name": "VERIFY"
    },
    "publisher": {
      "@type": "Organization",
      "name": "VERIFY",
      "url": "${MAIN_URL}"
    }
  }
  </script>

  <!-- Schema.org BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Strona główna",
        "item": "${MAIN_URL}"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Poradniki",
        "item": "${SITE_URL}"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": ${JSON.stringify(title)},
        "item": "${url}"
      }
    ]
  }
  </script>

  <footer>
    <p><a href="${MAIN_URL}">← Wróć do VERIFY</a> | <a href="${SITE_URL}">Blog</a></p>
    <p style="margin-top: 12px; font-size: 14px;">© ${pubDate.getFullYear()} VERIFY - Inteligentna Weryfikacja Kontrahentów</p>
  </footer>
</body>
</html>`;
}

/**
 * Builds an article card HTML for index.html listing.
 * @param {object} params
 * @param {string} params.slug
 * @param {string} params.title
 * @param {string} params.excerpt - Short description / excerpt
 * @param {Date} [params.date]
 * @returns {string} Article card HTML
 */
function buildArticleCard({ slug, title, excerpt, date }) {
  const pubDate = date || new Date();
  const url = `${SITE_URL}/${slug}.html`;
  const displayDate = formatDate(pubDate);

  return `    <article style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <h2 style="font-size: 28px; margin-bottom: 12px;">
        <a href="${url}" style="color: #1e293b;">${escapeHtml(title)}</a>
      </h2>
      <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">${displayDate}</p>
      <p style="color: #475569; margin-bottom: 16px;">${escapeHtml(excerpt)}</p>
      <a href="${url}" style="color: #3b82f6; font-weight: 600;">Czytaj więcej →</a>
    </article>`;
}

/**
 * Builds a sitemap <url> entry.
 * @param {object} params
 * @param {string} params.slug
 * @param {Date} [params.date]
 * @returns {string} Sitemap XML entry
 */
function buildSitemapEntry({ slug, date }) {
  const lastmod = formatDateShort(date || new Date());
  return `<url>
      <loc>${SITE_URL}/${slug}.html</loc>
      <lastmod>${lastmod}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>`;
}

/**
 * Inserts a CTA box roughly in the middle of the article HTML.
 * Finds the midpoint H2 tag and inserts after it (after the next paragraph).
 */
function insertCtaInMiddle(html) {
  const h2Matches = [...html.matchAll(/<h2[^>]*>/gi)];
  if (h2Matches.length < 2) {
    // If less than 2 H2s, just prepend CTA before content
    return html + '\n' + CTA_BOX;
  }

  // Insert after the middle H2's section
  const midIndex = Math.floor(h2Matches.length / 2);
  const midH2 = h2Matches[midIndex];
  const insertPos = midH2.index;

  return html.slice(0, insertPos) + '\n' + CTA_BOX + '\n' + html.slice(insertPos);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { buildArticlePage, buildArticleCard, buildSitemapEntry, SITE_URL, CTA_BOX };
