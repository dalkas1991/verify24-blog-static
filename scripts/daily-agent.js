#!/usr/bin/env node
'use strict';

/**
 * Verify24 — Daily Agent
 * Tryby: --mode morning | --mode evening
 * Wysyła HTML email przez SendGrid.
 *
 * Zmienne środowiskowe:
 *   ANTHROPIC_API_KEY  — klucz Claude
 *   SENDGRID_API_KEY   — klucz SendGrid
 *   TO_EMAIL           — adres odbiorcy (np. daniel@verify24.pl)
 */

const Anthropic = require('@anthropic-ai/sdk');
const sgMail    = require('@sendgrid/mail');

const MODE     = (process.argv.find(a => a.startsWith('--mode=')) || '--mode=morning').split('=')[1];
const TO_EMAIL = process.env.TO_EMAIL || 'kontakt@verify24.pl';

const CONTEXT = `
Daniel, 34 lata, Poznań. Founder Verify24 — SaaS do weryfikacji kontrahentów dla firm transportowych.
Produkt ~85% gotowy. Główne wyzwanie: zdobycie pierwszych płacących klientów (MRR > 0).
Zasady: Najpierw sprzedaż, potem funkcje. Dane > gadanie. MVP ma zarabiać, nie wyglądać.
Kanały: LinkedIn (800 kontaktów, transport), giełdy transportowe, cold email.
Runway: 3–6 miesięcy. Pracuje sam, 4h dziennie na Verify24.
`.trim();

// ─── Prompt morning ───────────────────────────────────────────────────────────

function morningPrompt(date, day) {
  return `Jesteś asystentem operacyjnym Daniela — foundera SaaS Verify24.

Kontekst:
${CONTEXT}

Dzisiaj: ${date} (${day})

Wygeneruj poranny brief — 3 konkretne priorytety na dziś.
Każdy priorytet musi być:
- Wykonalny w 1–3h
- Skupiony na: pozyskaniu klientów LUB sprzedaży LUB widoczności (LinkedIn/content)
- Konkretny — nie "pracuj nad X" tylko "zrób DOKŁADNIE X"

Odpowiedz TYLKO JSON:
{
  "greeting": "Dzień dobry! 1–2 zdania motywujące, nawiązujące do dnia tygodnia",
  "priorities": [
    {
      "number": 1,
      "title": "krótki tytuł max 6 słów",
      "action": "konkretne działanie — co dokładnie zrobić",
      "why": "dlaczego to ważne dziś — 1 zdanie"
    },
    { "number": 2, "title": "...", "action": "...", "why": "..." },
    { "number": 3, "title": "...", "action": "...", "why": "..." }
  ],
  "focus_time": "sugerowany blok czasowy np. '12:00–15:00'",
  "quote": "krótki cytat lub zasada na dziś (max 12 słów)"
}`;
}

// ─── Prompt evening ───────────────────────────────────────────────────────────

function eveningPrompt(date, day) {
  return `Jesteś asystentem operacyjnym Daniela — foundera SaaS Verify24.

Kontekst:
${CONTEXT}

Dzisiaj: ${date} (${day})

Wygeneruj wieczorne podsumowanie i plan na jutro.

Odpowiedz TYLKO JSON:
{
  "summary": "1–2 zdania podsumowania — co typowy founder SaaS powinien był dziś osiągnąć",
  "reflection": [
    "Pytanie refleksyjne 1 (zaczyna się od 'Czy dziś...')",
    "Pytanie refleksyjne 2",
    "Pytanie refleksyjne 3"
  ],
  "tomorrow": [
    {
      "number": 1,
      "title": "priorytet na jutro — krótko",
      "action": "konkretne działanie"
    },
    { "number": 2, "title": "...", "action": "..." },
    { "number": 3, "title": "...", "action": "..." }
  ],
  "wins": "jedno zdanie o tym co warto docenić w sobie każdego dnia jako founder",
  "night_task": "jedno małe zadanie do zrobienia wieczorem (max 30 min)"
}`;
}

// ─── HTML email ───────────────────────────────────────────────────────────────

function buildMorningHtml(data, date) {
  const priorities = data.priorities.map(p => `
    <div style="background:#1C2A42;border-radius:12px;padding:20px 24px;margin-bottom:12px;border-left:4px solid #FE6E00;">
      <div style="color:#FE6E00;font-size:12px;font-weight:700;letter-spacing:1px;margin-bottom:6px;">
        PRIORYTET ${p.number}
      </div>
      <div style="color:#F8F8F7;font-size:18px;font-weight:700;margin-bottom:8px;">${p.title}</div>
      <div style="color:#C8D0DC;font-size:15px;margin-bottom:8px;">→ ${p.action}</div>
      <div style="color:#7A8A9E;font-size:13px;font-style:italic;">${p.why}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#091020;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0F172B,#1C2A42);border-radius:16px;padding:28px 32px;margin-bottom:16px;border-top:4px solid #2563EB;">
    <div style="color:#7A8A9E;font-size:13px;margin-bottom:6px;">${date}</div>
    <div style="color:#F8F8F7;font-size:24px;font-weight:700;">Poranny Brief</div>
    <div style="color:#C8D0DC;font-size:16px;margin-top:8px;">${data.greeting}</div>
  </div>

  <!-- Priorytety -->
  <div style="margin-bottom:16px;">
    <div style="color:#7A8A9E;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:12px;">3 PRIORYTETY NA DZIŚ</div>
    ${priorities}
  </div>

  <!-- Focus block -->
  <div style="background:#1C2A42;border-radius:12px;padding:16px 24px;margin-bottom:16px;display:flex;align-items:center;">
    <div style="color:#2563EB;font-size:22px;margin-right:12px;">⏰</div>
    <div>
      <div style="color:#7A8A9E;font-size:12px;font-weight:700;letter-spacing:1px;">BLOK FOCUS</div>
      <div style="color:#F8F8F7;font-size:16px;font-weight:700;">${data.focus_time}</div>
    </div>
  </div>

  <!-- Quote -->
  <div style="background:linear-gradient(135deg,#FE6E0015,#2563EB15);border:1px solid #FE6E0040;border-radius:12px;padding:16px 24px;margin-bottom:24px;text-align:center;">
    <div style="color:#FE6E00;font-size:15px;font-style:italic;">"${data.quote}"</div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:16px;border-top:1px solid #1C2A42;">
    <div style="color:#2563EB;font-weight:700;font-size:16px;">VERIFY24.PL</div>
    <div style="color:#7A8A9E;font-size:12px;margin-top:4px;">Weryfikuj zanim podpiszesz.</div>
  </div>

</div>
</body></html>`;
}

function buildEveningHtml(data, date) {
  const reflection = data.reflection.map(q => `
    <div style="background:#1C2A42;border-radius:10px;padding:14px 20px;margin-bottom:10px;border-left:3px solid #2563EB;">
      <div style="color:#C8D0DC;font-size:15px;">${q}</div>
    </div>
  `).join('');

  const tomorrow = data.tomorrow.map(p => `
    <div style="background:#1C2A42;border-radius:12px;padding:16px 20px;margin-bottom:10px;border-left:4px solid #00C758;">
      <div style="color:#00C758;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:4px;">JUTRO — ${p.number}</div>
      <div style="color:#F8F8F7;font-size:16px;font-weight:700;margin-bottom:6px;">${p.title}</div>
      <div style="color:#C8D0DC;font-size:14px;">→ ${p.action}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#091020;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0F172B,#1C2A42);border-radius:16px;padding:28px 32px;margin-bottom:16px;border-top:4px solid #00C758;">
    <div style="color:#7A8A9E;font-size:13px;margin-bottom:6px;">${date}</div>
    <div style="color:#F8F8F7;font-size:24px;font-weight:700;">Podsumowanie Dnia</div>
    <div style="color:#C8D0DC;font-size:15px;margin-top:8px;">${data.summary}</div>
  </div>

  <!-- Refleksja -->
  <div style="margin-bottom:16px;">
    <div style="color:#7A8A9E;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:12px;">REFLEKSJA</div>
    ${reflection}
  </div>

  <!-- Plan na jutro -->
  <div style="margin-bottom:16px;">
    <div style="color:#7A8A9E;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:12px;">PLAN NA JUTRO</div>
    ${tomorrow}
  </div>

  <!-- Wins + night task -->
  <div style="background:linear-gradient(135deg,#00C75815,#2563EB15);border:1px solid #00C75840;border-radius:12px;padding:16px 24px;margin-bottom:16px;">
    <div style="color:#00C758;font-size:13px;font-weight:700;margin-bottom:6px;">PAMIĘTAJ</div>
    <div style="color:#C8D0DC;font-size:14px;">${data.wins}</div>
  </div>

  <div style="background:#1C2A42;border-radius:12px;padding:14px 20px;margin-bottom:24px;">
    <div style="color:#FE6E00;font-size:12px;font-weight:700;letter-spacing:1px;margin-bottom:4px;">ZADANIE NA WIECZÓR</div>
    <div style="color:#F8F8F7;font-size:15px;">${data.night_task}</div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:16px;border-top:1px solid #1C2A42;">
    <div style="color:#2563EB;font-weight:700;font-size:16px;">VERIFY24.PL</div>
    <div style="color:#7A8A9E;font-size:12px;margin-top:4px;">Weryfikuj zanim podpiszesz.</div>
  </div>

</div>
</body></html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('Brak ANTHROPIC_API_KEY'); process.exit(1); }
  if (!process.env.SENDGRID_API_KEY)  { console.error('Brak SENDGRID_API_KEY');  process.exit(1); }

  const now  = new Date();
  const date = now.toLocaleDateString('pl-PL', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const day  = now.toLocaleDateString('pl-PL', { weekday:'long' });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  console.log(`[daily-agent] mode=${MODE} date=${date}`);

  const prompt = MODE === 'evening' ? eveningPrompt(date, day) : morningPrompt(date, day);
  const subject = MODE === 'evening'
    ? `☑️ Podsumowanie dnia — ${now.toLocaleDateString('pl-PL')}`
    : `☀️ Poranny brief — ${now.toLocaleDateString('pl-PL')}`;

  // Wywołaj Claude
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 900,
    messages: [{ role: 'user', content: prompt }],
  });

  let text = resp.content[0].text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  const data = JSON.parse(text);

  // Zbuduj HTML
  const html = MODE === 'evening'
    ? buildEveningHtml(data, date)
    : buildMorningHtml(data, date);

  // Wyślij przez SendGrid
  await sgMail.send({
    to:      TO_EMAIL,
    from:    process.env.FROM_EMAIL || TO_EMAIL,
    subject,
    html,
  });

  console.log(`[daily-agent] ✅ Email wysłany → ${TO_EMAIL}`);
}

main().catch(err => { console.error('[daily-agent] ❌', err.message); process.exit(1); });
