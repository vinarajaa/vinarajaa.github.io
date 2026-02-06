/**
 * Dice.fm NYC events scraper.
 * Fetches https://dice.fm/browse/new-york and parses event cards into our schema.
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in env.
 */
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const DICE_NYC_URL = "https://dice.fm/browse/new-york";
const PLATFORM = "Dice";

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("Missing env: " + name);
  return v;
}

function normalizeDate(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  const match = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizeTime(str) {
  if (!str || typeof str !== "string") return null;
  return str.trim() || null;
}

function extractEventsFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  // Dice event links: /event/xxx or full dice.fm/event/...
  $('a[href*="/event/"]').each(function () {
    let href = $(this).attr("href");
    if (!href) return;
    if (href.startsWith("/")) href = "https://dice.fm" + href;
    if (seen.has(href)) return;
    seen.add(href);

    const card = $(this).closest("[class*='card'], [class*='Card'], [class*='event'], [class*='Event'], li, article");
    const titleEl = card.length ? card.find("h2, h3, [class*='title'], [class*='Title']").first() : $(this);
    const title = (titleEl.text() || $(this).text()).trim().slice(0, 300) || "Event";

    let dateStr = null;
    let timeStr = null;
    let venueStr = null;
    let priceStr = null;
    card.find("[class*='date'], [class*='Date'], time, [datetime]").each(function () {
      const dt = $(this).attr("datetime");
      if (dt) {
        const d = new Date(dt);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10);
          const t = d.toTimeString().slice(0, 5);
          if (t !== "00:00") timeStr = t;
        }
      }
      const t = $(this).text().trim();
      if (t && !dateStr && /^\d{4}-\d{2}-\d{2}|[A-Za-z]{3}\s+\d{1,2}|[\d/.-]+/.test(t)) dateStr = t;
    });
    card.find("[class*='venue'], [class*='Venue'], [class*='location'], [class*='Location']").each(function () {
      const t = $(this).text().trim();
      if (t && !venueStr) venueStr = t.slice(0, 200);
    });
    card.find("[class*='price'], [class*='Price'], [class*='cost']").each(function () {
      const t = $(this).text().trim();
      if (t && !priceStr) priceStr = t.slice(0, 50);
    });
    if (!dateStr) {
      const anyDate = card.text().match(/(\d{4})-(\d{2})-(\d{2})/);
      if (anyDate) dateStr = anyDate[0];
    }

    const date = normalizeDate(dateStr) || new Date().toISOString().slice(0, 10);
    events.push({
      title,
      date,
      time: normalizeTime(timeStr),
      neighborhood: venueStr ? venueStr.slice(0, 200) : null,
      price: priceStr ? priceStr.slice(0, 100) : null,
      link: href,
      platform: PLATFORM
    });
  });

  // Fallback: look for __NEXT_DATA__ or similar JSON in script tags (Dice may use Next.js)
  $('script#__NEXT_DATA__').each(function () {
    try {
      const data = JSON.parse($(this).html());
      const props = data.props?.pageProps || data.props || {};
      const list = props.events || props.eventList || props.eventsList || [];
      if (Array.isArray(list) && list.length > 0) {
        list.forEach(function (ev) {
          const link = ev.url || ev.link || (ev.slug ? "https://dice.fm/event/" + ev.slug : null);
          if (!link || seen.has(link)) return;
          seen.add(link);
          const title = (ev.name || ev.title || "Event").toString().slice(0, 300);
          let date = null;
          if (ev.start_date) date = ev.start_date.slice(0, 10);
          else if (ev.date) date = normalizeDate(ev.date);
          else if (ev.start) date = new Date(ev.start).toISOString().slice(0, 10);
          if (!date) return;
          let time = null;
          if (ev.start_time) time = ev.start_time;
          else if (ev.start && typeof ev.start === "string" && ev.start.includes("T")) time = ev.start.slice(11, 16);
          const venue = ev.venue?.name || ev.venue_name || ev.location || null;
          const price = ev.price || ev.price_display || (ev.free ? "Free" : null);
          events.push({
            title,
            date,
            time: time ? String(time).slice(0, 50) : null,
            neighborhood: venue ? String(venue).slice(0, 200) : null,
            price: price ? String(price).slice(0, 100) : null,
            link,
            platform: PLATFORM
          });
        });
      }
    } catch (_) {}
  });

  return events;
}

async function scrapeDiceNy() {
  const res = await fetch(DICE_NYC_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NYC-Events-Scraper/1.0)" }
  });
  if (!res.ok) throw new Error("Dice fetch " + res.status);
  const html = await res.text();
  return extractEventsFromHtml(html, DICE_NYC_URL);
}

async function pushToSupabase(events) {
  const url = getEnv("SUPABASE_URL").replace(/\/$/, "") + "/rest/v1/events";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
  const headers = {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": "Bearer " + key,
    "Prefer": "return=minimal"
  };
  let inserted = 0;
  let skipped = 0;
  for (const ev of events) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(ev)
      });
      if (r.ok) inserted++;
      else if (r.status === 409) skipped++; // duplicate link
      else console.warn("POST failed", r.status, await r.text());
    } catch (e) {
      console.warn("Error inserting", ev.link, e.message);
    }
  }
  return { inserted, skipped };
}

async function main() {
  console.log("Scraping Dice.fm NYC...");
  const events = await scrapeDiceNy();
  console.log("Found", events.length, "events");
  if (events.length === 0) {
    console.log("No events parsed. Dice may use client-side rendering; check NYC_EVENTS_SETUP.md for Puppeteer option.");
    return;
  }
  try {
    const result = await pushToSupabase(events);
    console.log("Inserted:", result.inserted, "Skipped (duplicate):", result.skipped);
  } catch (e) {
    console.error("Supabase push failed:", e.message);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { main };
