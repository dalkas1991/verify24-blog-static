#!/usr/bin/env node
// generate-post.js — Blog post generator using Claude API
// Zero npm dependencies — uses Node.js 20 built-in fetch

const fs = require('fs');
const path = require('path');
const { buildArticlePage, buildArticleCard, buildSitemapEntry, SITE_URL } = require('./templates');

const ROOT = path.resolve(__dirname, '..');
const TOPICS_PATH = path.join(ROOT, 'data', 'topics.json');
const INDEX_PATH = path.join(ROOT, 'index.html');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';

async function main() {
  // 1. Read topics and find first pending
  const topics = JSON.parse(fs.readFileSync(TOPICS_PATH, 'utf8'));
  const topic = topics.find(t => t.status === 'pending');

  if (!topic) {
    console.log('No pending topics found. All topics have been published or failed.');
    process.exit(0);
  }

  console.log(`Generating post for: "${topic.titleHint}" (id: ${topic.id}, slug: ${topic.slug})`);

  try {
    // 2. Call Claude API to generate article content
    const article = await generateArticle(topic);

    // 3. Validate the response
    validateArticle(article);

    // 4. Build HTML file
    const now = new Date();
    const html = buildArticlePage({
      slug: topic.slug,
      title: article.title,
      metaDescription: article.metaDescription,
      articleHtml: article.articleHtml,
      date: now,
    });

    const articlePath = path.join(ROOT, `${topic.slug}.html`);
    fs.writeFileSync(articlePath, html, 'utf8');
    console.log(`Created: ${topic.slug}.html`);

    // 5. Update index.html — insert new article card at the top
    updateIndex({
      slug: topic.slug,
      title: article.title,
      excerpt: article.excerpt,
      date: now,
    });
    console.log('Updated: index.html');

    // 6. Update sitemap.xml
    updateSitemap({ slug: topic.slug, date: now });
    console.log('Updated: sitemap.xml');

    // 7. Mark topic as published
    topic.status = 'published';
    topic.publishedAt = now.toISOString();
    fs.writeFileSync(TOPICS_PATH, JSON.stringify(topics, null, 2) + '\n', 'utf8');
    console.log(`Topic ${topic.id} marked as published.`);
    console.log('Done!');

  } catch (err) {
    console.error(`ERROR generating post for topic ${topic.id}:`, err.message);

    // Mark as failed so next run picks the next topic
    topic.status = 'failed';
    topic.failedAt = new Date().toISOString();
    topic.failReason = err.message;
    fs.writeFileSync(TOPICS_PATH, JSON.stringify(topics, null, 2) + '\n', 'utf8');
    console.error(`Topic ${topic.id} marked as failed.`);
    process.exit(1);
  }
}

async function generateArticle(topic) {
  const prompt = `Jesteś ekspertem ds. weryfikacji kontrahentów i bezpieczeństwa biznesowego w Polsce.
Napisz artykuł na blog VERIFY (verify24.pl) - systemu do weryfikacji kontrahentów po NIP.

TEMAT: ${topic.titleHint}
SŁOWA KLUCZOWE SEO: ${topic.keywords.join(', ')}
KATEGORIA: ${topic.category}

WYMAGANIA:
1. Artykuł profesjonalny, merytoryczny, 800-1200 słów
2. Pisz po polsku, naturalnym językiem (nie przesadzaj z uprzejmościami)
3. Minimum 4 nagłówki H2
4. Używaj list punktowanych (ul/li) i numerowanych (ol/li) gdzie pasuje
5. Organicznie wpleć słowa kluczowe w tekst
6. Na końcu krótki akapit o tym jak VERIFY może pomóc w tym temacie
7. NIE używaj tagów <script>, <style>, <img>
8. Używaj TYLKO tagów: h2, h3, p, ul, ol, li, strong, em, a
9. Linki do zewnętrznych źródeł (rejestry rządowe itp.) używaj z target="_blank"

ODPOWIEDZ WYŁĄCZNIE w formacie JSON (bez markdown code blocks):
{
  "title": "Pełny tytuł artykułu (max 70 znaków)",
  "metaDescription": "Opis meta dla SEO (max 160 znaków)",
  "articleHtml": "Treść artykułu w HTML (h2, p, ul, li, strong, etc.)",
  "excerpt": "Krótki opis artykułu na stronę główną (1-2 zdania, max 200 znaków)"
}`;

  const body = {
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  };

  let response;
  let lastError;

  // Retry once on transient errors
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        if ((res.status === 429 || res.status >= 500) && attempt === 0) {
          console.log(`API returned ${res.status}, retrying in 10s...`);
          await sleep(10000);
          lastError = new Error(`API ${res.status}: ${errText}`);
          continue;
        }
        throw new Error(`API ${res.status}: ${errText}`);
      }

      response = await res.json();
      break;
    } catch (err) {
      if (attempt === 0 && err.message.includes('fetch')) {
        console.log('Network error, retrying in 10s...');
        await sleep(10000);
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  if (!response) {
    throw lastError || new Error('Failed after retries');
  }

  // Extract text content from Claude response
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) {
    throw new Error('No text content in API response');
  }

  // Parse JSON from response (strip potential markdown code fences)
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let article;
  try {
    article = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse JSON from API response: ${e.message}\nRaw: ${jsonStr.slice(0, 500)}`);
  }

  return article;
}

function validateArticle(article) {
  if (!article.title || !article.metaDescription || !article.articleHtml || !article.excerpt) {
    throw new Error('Article missing required fields (title, metaDescription, articleHtml, excerpt)');
  }

  if (article.title.length > 100) {
    throw new Error(`Title too long: ${article.title.length} chars`);
  }

  if (article.metaDescription.length > 200) {
    throw new Error(`Meta description too long: ${article.metaDescription.length} chars`);
  }

  if (article.articleHtml.length < 500) {
    throw new Error(`Article HTML too short: ${article.articleHtml.length} chars (min 500)`);
  }

  // Must have at least 2 H2 headings
  const h2Count = (article.articleHtml.match(/<h2/gi) || []).length;
  if (h2Count < 2) {
    throw new Error(`Article has only ${h2Count} H2 headings (min 2)`);
  }

  // Must not contain script or style tags
  if (/<script/i.test(article.articleHtml) || /<style/i.test(article.articleHtml)) {
    throw new Error('Article contains forbidden script/style tags');
  }
}

function updateIndex({ slug, title, excerpt, date }) {
  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');

  const newCard = buildArticleCard({ slug, title, excerpt, date });

  // Insert new card right after <div class="container"> as the first article
  const containerMarker = '<div class="container">';
  const containerPos = indexHtml.indexOf(containerMarker);
  if (containerPos === -1) {
    throw new Error('Could not find container div in index.html');
  }

  const insertPos = containerPos + containerMarker.length;
  indexHtml = indexHtml.slice(0, insertPos) + '\n' + newCard + '\n' + indexHtml.slice(insertPos);

  fs.writeFileSync(INDEX_PATH, indexHtml, 'utf8');
}

function updateSitemap({ slug, date }) {
  let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');

  const newEntry = buildSitemapEntry({ slug, date });

  // Insert before closing </urlset>
  sitemap = sitemap.replace('</urlset>', newEntry + '\n</urlset>');

  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
