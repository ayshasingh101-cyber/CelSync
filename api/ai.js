// CelSync AI service: company research, pitch decks and emails.
// Runs on Vercel. The Anthropic key lives only in Vercel's environment settings and never reaches the browser.
const { RESEARCH_SAMPLE, DECK_SAMPLE } = require('./_ref.js');

const MODEL = process.env.CELSYNC_MODEL || 'claude-sonnet-5-5';
const API = 'https://api.anthropic.com/v1/messages';

const CELETEL = `Celetel is an Indian communications technology company (celetel.com). What it sells:
- WhatsApp Business API: verified business account, chatbots, catalogues, payments inside WhatsApp, Click-to-WhatsApp ads
- RCS business messaging: verified sender, rich cards with images and buttons inside the Messages app
- SMS: DLT-registered bulk and transactional SMS, OTPs
- Voice and IVR: missed-call numbers, IVR menus, voice alerts
- Email
- CelChat AI: an AI chatbot for websites and WhatsApp that answers 24/7 in Hindi and English
- A CRM dashboard and one shared inbox for every channel
- Payment links and reminders in chat, using the client's own payment gateway (Razorpay, PayU and so on)
Celetel handles verification (Meta, TRAI/DLT), setup, templates, compliance and support.`;

const STYLE = `Writing rules (Aysha's house style, copied from her samples):
- Simple words and short sentences. Explain things the way you would to a busy business owner.
- Be specific to this company: name their real products, clients, cities, campaigns and channels you found.
- Never invent numbers, clients or quotes. If something is a guess, say "(to confirm)" or "most likely".
- Facts about the company come from your web research; put every source you used in the sources list.
- No hype, no buzzwords, no exclamation marks. British/Indian English spelling.
- Use the rupee sign only for real prices you found; never invent prices or Celetel commercial terms. Leave terms as [__].`;

function send(res, status, obj) { res.status(status).setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); }

async function claude({ system, user, search = 0, maxTokens = 12000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  const messages = [{ role: 'user', content: user }];
  let all = [];
  for (let i = 0; i < 5; i++) {
    const body = { model: MODEL, max_tokens: maxTokens, system, messages };
    if (search) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: search }];
    const r = await fetch(API, { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (j.error && j.error.message) || ('AI service error ' + r.status);
      const e = new Error(r.status === 401 ? 'The Anthropic API key in Vercel is not valid. Check ANTHROPIC_API_KEY.' : r.status === 429 ? 'The AI is busy (rate limit). Wait a minute and try again.' : msg);
      e.status = r.status === 401 ? 503 : 502; throw e;
    }
    all = all.concat(j.content || []);
    if (j.stop_reason === 'pause_turn') {
      // Continue the same assistant turn: send everything so far back unchanged.
      if (messages.length > 1) messages.pop();
      messages.push({ role: 'assistant', content: all });
      continue;
    }
    if (j.stop_reason === 'max_tokens') { const e = new Error('The answer was too long and got cut off. Try again.'); e.status = 502; throw e; }
    const text = all.filter(c => c.type === 'text').map(c => c.text).join('');
    const sources = [];
    all.forEach(c => { if (c.type === 'web_search_tool_result' && Array.isArray(c.content)) c.content.forEach(x => { if (x.url && !sources.some(s => s.url === x.url)) sources.push({ title: x.title || x.url, url: x.url }) }) });
    return { text, sources };
  }
  const e = new Error('The research took too many steps. Try again.'); e.status = 502; throw e;
}

function parseJson(text) {
  let t = text;
  const m = t.match(/<json>([\s\S]*?)<\/json>/i);
  if (m) t = m[1];
  else { const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) t = t.slice(a, b + 1); }
  t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (e) { const er = new Error('The AI reply was not in the expected format. Try again.'); er.status = 502; throw er; }
}

const RESEARCH_SCHEMA = `{
 "company": "Short brand name, e.g. S-Pure",
 "legal": "Registered/legal name if found, else same as company",
 "website": "https://... or empty",
 "domain": "company email/web domain, e.g. shrihitech.in",
 "industry": "one of: D2C, OTT, Tyres, FMCG, Logistics, Healthcare, Fitness, Media, Agency partner, B2B services, Education, Retail, Finance, Hospitality, Real estate, Other",
 "city": "HQ city",
 "intro": "One sentence under the title, like: Everything Celetel will set up for S-Pure, how S-Pure's customers will benefit, and how easy it becomes for everyone, explained in simple words.",
 "summary": {"text": "2 sentences", "who": "Who X is: ...", "found": "What we found: ...", "will": "What Celetel will do: ..."},
 "about": {"text": "Paragraph: what they sell, scale, locations, notable clients/partners", "audience": [{"who": "group", "need": "what they need"}]},
 "found": {"intro": "Checked on <date>, ... one sentence", "items": [{"lead": "short bold lead", "text": "finding"}]},
 "setup": {"intro": "Each area below runs on Celetel's channels: ...", "areas": [{"title": "Website and CelChat AI", "type": "bullets or steps", "items": [{"lead": "optional bold lead or empty", "text": "..."}], "note": "optional extra line or empty"}]},
 "benefits": {"intro": "...", "groups": [{"group": "Customer group", "examples": "real examples", "matters": "what matters to them", "benefit": "how they benefit with Celetel"}], "selfNote": "For X itself: ..."},
 "easy": {"intro": "...", "rows": [{"who": "For", "does": "What they do", "effort": "Effort"}], "note": "who sets up what"},
 "crm": {"text": "Celetel will provide X with a CRM dashboard where ...", "items": ["..."], "usedBy": "roles"},
 "beforeAfter": {"intro": "The \\"Today\\" column is our best reading from public information; let's correct it together in the meeting.", "rows": [{"task": "...", "today": "...", "celetel": "..."}]},
 "rollout": {"intro": "...", "phases": [{"when": "Days 1-30, pilot", "text": "..."}], "scorecard": "metrics"},
 "needs": ["what we need from them"],
 "questions": ["questions to discuss"],
 "sources": [{"title": "...", "url": "https://... or empty"}],
 "crmFields": {"fit": 0-100, "products": ["WhatsApp API","RCS","SMS","Voice / IVR","CelChat AI","Email"], "deal": "short deal name", "contact": {"name": "decision maker if found publicly, else empty", "role": "", "email": "only if published, else empty"}, "why": "one sentence why Celetel fits", "idea": "one concrete idea for the first email", "partner": true/false}
}`;

const DECK_SCHEMA = `{
 "company": "Short brand name",
 "pitchType": "PARTNERSHIP PITCH for agencies/resellers, otherwise SALES PITCH",
 "brandColor": "the company's main brand colour as hex, or a tasteful guess",
 "monogram": "1-3 letters for the company's logo circle",
 "cover": {"headline": "first part of the big line", "accent": "the italic blue part", "subtitle": "one line", "phones": [PHONE, PHONE]},
 "today": {"eyebrow": "X TODAY", "headline": "...", "accent": "...", "text": "1-2 sentences with a real fact", "chips": ["6 things they do/sell"], "industriesLabel": "Industries:|Customers:|Products:", "industries": "...", "recentLabel": "Recent work:|Recent:", "recent": "...", "missing": {"title": "The conversation after the click", "text": "...", "kicker": "That is where Celetel comes in."}, "source": "Source: ..."},
 "problem": {"headline": "...", "accent": "...", "flow": [{"tag": "X|LEAK", "text": "...", "leak": false}], "intro": "..., already points here:", "points": ["3 short evidence points"], "source": "..."},
 "fit": {"headline": "Meet your", "accent": "...", "cols": ["YOUR SERVICE|YOUR NEED", "WHAT CELETEL ADDS", "WHAT THE CLIENT SEES|WHAT YOUR CUSTOMER SEES"], "rows": [{"name": "...", "adds": "...", "sees": "...", "isNew": false}]},
 "demos": [{"topic": "SHORT TOPIC", "headline": "...", "accent": "...", "steps": [{"lead": "...", "text": "..."}], "reportLabel": "You can report:|You can track:|Fixes:", "report": "...", "phones": [PHONE, PHONE]}],
 "options": {"eyebrow": "HOW WE PARTNER|HOW WE START", "headline": "...", "accent": "...", "cards": [{"tag": "REFER", "title": "...", "text": "...", "term": "Referral fee: [__]%", "recommended": false}], "either": "Either way: ...", "footnote": "..."},
 "roi": {"headline": "What X", "accent": "wins", "items": [{"icon": "rupee|chart|lock|star|clock|users", "title": "...", "text": "..."}]},
 "rollout": {"headline": "...", "accent": "...", "steps": [{"when": "WEEKS 1-2", "title": "...", "text": "..."}], "footnote": "Verification timelines depend on Meta and TRAI approvals."},
 "closing": {"statement": "...", "accent": "...", "cards": [{"tag": "X BRINGS", "text": "<b>Lead:</b> rest"}, {"tag": "CELETEL BRINGS", "text": "..."}, {"tag": "TOGETHER", "text": "..."}]},
 "next": {"headline": "Let's build it", "accent": "together", "steps": [{"title": "A 30-minute call", "text": "..."}]},
 "crmFields": {"fit": 0-100, "products": ["..."], "deal": "short deal name", "industry": "...", "city": "...", "domain": "...", "website": "..."}
}
PHONE = {"app": "whatsapp|instagram|rcs|sms", "name": "account or brand name shown in the header", "msgs": [{"me": true|false, "text": "message text", "time": "7:41 PM", "buttons": ["optional quick-reply buttons"], "card": {"title": "optional rich card title", "text": "optional card text"}}]}
For "instagram" phones: msgs[0].text is the ad caption and msgs[0].buttons[0] is the CTA bar text.
Exactly 6 rows in fit (mark at most one isNew), 2-4 demos (each exactly 2 steps and 2 phones, 3-6 short messages per phone), 3 options cards (the middle one recommended), 4 roi items, 4 rollout steps, 3 closing cards, 3 next steps, 5 problem flow steps (first 2 from the company's side, last 3 are leaks). Headlines are short (max 8 words in total with the accent).`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'The AI is not switched on yet. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy.', setup: true });
  const code = process.env.CELSYNC_ACCESS_CODE;
  if (!code) return send(res, 503, { error: 'The access code is not set up in Vercel (CELSYNC_ACCESS_CODE).', setup: true });
  if ((req.headers['x-celsync-code'] || '') !== code) return send(res, 401, { error: 'Wrong or missing access code. Enter it in Settings → AI.', auth: true });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }
  b = b || {};
  const task = b.task;
  const company = String(b.company || '').slice(0, 120).trim();
  const today = String(b.today || new Date().toDateString()).slice(0, 40);
  const sender = String(b.sender || 'Aysha Singh, Sales, Celetel · aysha@celetel.com').slice(0, 160);
  const notes = String(b.notes || '').slice(0, 2000);
  const website = String(b.website || '').slice(0, 200);

  try {
    if (task === 'ping') return send(res, 200, { ok: true, model: MODEL });

    if (task === 'research') {
      if (!company) return send(res, 400, { error: 'Enter a company name.' });
      const system = `You are the research analyst for Celetel's sales team. You research Indian companies on the web and write a "Communication Plan for Discussion" document that follows Aysha's master sample exactly: same sections, same order, same tone, same level of detail.\n\n${CELETEL}\n\n${STYLE}`;
      const user = `Research this company and write its communication plan.\n\nCompany: ${company}${website ? `\nWebsite: ${website}` : ''}${notes ? `\nNotes from Aysha: ${notes}` : ''}\nToday's date: ${today}\nPrepared by: ${sender}\n\nSteps:\n1. Search the web: the official website (check what it actually shows), Instagram/LinkedIn, Google/IndiaMART/marketplace listings, news, funding, clients, locations and how customers contact them today.\n2. Work out who talks to them (customers, partners, staff) and where conversations break down.\n3. Write the plan: what Celetel will set up (6-9 numbered areas, each with bullets or numbered steps), how each customer group benefits, before/after, rollout, needs and questions.\n\nHere is the master sample (for S-Pure). Match its structure, headings, sentence style and depth; adapt every section to the new company:\n<sample>\n${RESEARCH_SAMPLE}\n</sample>\n\nReturn ONLY one JSON object inside <json></json> tags, with this shape:\n${RESEARCH_SCHEMA}`;
      const out = await claude({ system, user, search: 8, maxTokens: 14000 });
      const data = parseJson(out.text);
      if (!data.sources || !data.sources.length) data.sources = out.sources.slice(0, 10);
      else out.sources.forEach(s => { if (data.sources.length < 14 && !data.sources.some(x => x.url === s.url)) data.sources.push(s) });
      data.date = today; data.sender = sender;
      return send(res, 200, { data });
    }

    if (task === 'deck') {
      if (!company) return send(res, 400, { error: 'Enter a company name.' });
      const research = b.research ? JSON.stringify(b.research).slice(0, 40000) : '';
      const system = `You write Celetel pitch decks. Every deck follows Aysha's master deck (Celetel × Fifth Avenue) exactly: the same 13-slide flow, the same layouts, the same short punchy headlines with an italic blue accent phrase, the same tone. You fill a JSON template; CelSync renders the design.\n\n${CELETEL}\n\n${STYLE}`;
      const user = `Make a customised pitch deck for: ${company}${website ? ` (${website})` : ''}.\nToday's date: ${today}. Presenter: ${sender}.${notes ? `\nNotes from Aysha: ${notes}` : ''}\n${research ? `\nUse this research (already checked on the web) as your facts:\n<research>${research}</research>\n` : '\nFirst research the company on the web (website, Instagram, LinkedIn, news) so every slide uses real facts about them.\n'}\nThe deck must show the company's own customers' journey in phone mock-ups (WhatsApp, Instagram ad, RCS or SMS), with realistic messages using their real products, store names and campaigns.\n\nHere is the text of the master deck, slide by slide. Copy its structure and tone; replace everything with this company:\n<sample>\n${DECK_SAMPLE}\n</sample>\n\nReturn ONLY one JSON object inside <json></json> tags, with this shape:\n${DECK_SCHEMA}`;
      const out = await claude({ system, user, search: research ? 0 : 6, maxTokens: 12000 });
      const data = parseJson(out.text);
      data.date = today; data.sender = sender;
      if (out.sources.length) data.sources = out.sources.slice(0, 10);
      return send(res, 200, { data });
    }

    if (task === 'email' || task === 'reply') {
      const ctx = b.research ? JSON.stringify(b.research).slice(0, 12000) : '';
      const thread = String(b.thread || '').slice(0, 12000);
      const kind = String(b.kind || 'intro').slice(0, 40);
      const system = `You write short, warm B2B sales emails for Aysha Singh (Sales, Celetel). Plain text, no markdown, no emojis. 90-160 words. One clear ask (usually a 20-30 minute call). Sign off with "Best,\\nAysha Singh\\nSales, Celetel\\naysha@celetel.com".\n\n${CELETEL}\n\n${STYLE}`;
      const user = task === 'reply'
        ? `Write a reply to the latest message in this email thread with ${company || 'the prospect'}.${ctx ? `\nWhat we know about them:\n${ctx}` : ''}\n<thread>\n${thread}\n</thread>${notes ? `\nAysha's instructions: ${notes}` : ''}\nReturn ONLY <json>{"body":"..."}</json>.`
        : `Write the ${kind === 'intro' ? 'first (intro) email' : kind} to ${company}.${b.contact ? ` Recipient: ${String(b.contact).slice(0, 120)}.` : ''}${b.hasDeck ? ' The pitch deck PDF is attached; mention it in one line.' : ''}\nUse one specific fact from the research and one concrete idea for their business.${ctx ? `\nResearch:\n${ctx}` : ''}${notes ? `\nAysha's instructions: ${notes}` : ''}\nReturn ONLY <json>{"subject":"...","body":"..."}</json>.`;
      const out = await claude({ system, user, search: 0, maxTokens: 1500 });
      return send(res, 200, { data: parseJson(out.text) });
    }

    return send(res, 400, { error: 'Unknown task.' });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message || 'Something went wrong.' });
  }
};
