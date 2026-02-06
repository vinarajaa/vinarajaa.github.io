/**
 * Dice.fm NYC events scraper.
 * Fetches Dice.fm NYC and parses event cards into our schema.
 * Requires: EVENTS_API_URL (your Vercel deployment, e.g. https://your-project.vercel.app) in env.
 */
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const DICE_NYC_URLS = [
  "https://dice.fm/browse/new-york?lng=en-US",
  "https://dice.fm/browse/new-york",
  "https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59?lng=en-US"
];
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
  if (isNaN(d.getTime())) return null;
  // "Fri 6 Feb" etc. often parse as year 2001 when no year given; fix to current/next year
  const now = new Date();
  let year = d.getFullYear();
  if (year < now.getFullYear()) {
    d.setFullYear(now.getFullYear());
    if (d < now) d.setFullYear(now.getFullYear() + 1);
  }
  return d.toISOString().slice(0, 10);
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
      if (t && !timeStr) {
        const timeInText = t.match(/(\d{1,2}:\d{2}\s*[AP]M)/i) || t.match(/(\d{1,2}:\d{2})/);
        if (timeInText) timeStr = timeInText[1].trim().slice(0, 50);
      }
    });
    if (!timeStr && card.length) {
      const cardText = card.text().replace(/\s+/g, " ");
      const timeMatch = cardText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i) || cardText.match(/\b(\d{1,2}:\d{2})\b/);
      if (timeMatch) timeStr = timeMatch[1].trim().slice(0, 50);
    }
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
          if (ev.start_time) time = String(ev.start_time).slice(0, 50);
          else if (ev.time) time = String(ev.time).slice(0, 50);
          else if (ev.start && typeof ev.start === "string" && ev.start.includes("T")) {
            const t = ev.start.slice(11, 16);
            if (t !== "00:00") time = t;
          }
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

/** Fetch event detail page and extract time (and optionally venue/price) from __NEXT_DATA__ or HTML */
async function fetchEventDetails(link) {
  try {
    const res = await fetch(link, { headers: DICE_FETCH_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    let time = null;
    let venue = null;
    let price = null;
    $('script#__NEXT_DATA__').each(function () {
      try {
        const data = JSON.parse($(this).html());
        const event = data.props?.pageProps?.event || data.props?.pageProps?.initialEvent || data.event || data.props?.event;
        if (!event) return;
        if (event.start && typeof event.start === "string" && event.start.includes("T")) {
          const t = event.start.slice(11, 16);
          if (t !== "00:00") time = t;
        }
        if (event.doors_open) time = time || String(event.doors_open).slice(0, 50);
        if (event.event_times?.[0]) time = time || String(event.event_times[0]).slice(0, 50);
        if (event.venue?.name) venue = event.venue.name.slice(0, 200);
        if (event.venue_name) venue = venue || String(event.venue_name).slice(0, 200);
        if (event.price_display) price = String(event.price_display).slice(0, 100);
        if (event.free && !price) price = "Free";
      } catch (_) {}
    });
    if (!time) {
      $("[datetime]").each(function () {
        const dt = $(this).attr("datetime");
        if (dt) {
          const d = new Date(dt);
          if (!isNaN(d.getTime())) {
            const t = d.toTimeString().slice(0, 5);
            if (t !== "00:00") time = t;
          }
        }
      });
    }
    if (!time) {
      const bodyText = $("body").text().replace(/\s+/g, " ");
      const m = bodyText.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i) || bodyText.match(/(\d{1,2}:\d{2})\s*(?:[AP]\.?M\.?|p\.m\.|a\.m\.)/i) || bodyText.match(/\b(\d{1,2}:\d{2})\b/);
      if (m) time = m[1].trim().slice(0, 50);
    }
    return { time, venue, price };
  } catch (_) {
    return null;
  }
}

const DICE_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://dice.fm/"
};

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function scrapeDiceNy() {
  let lastError;
  for (const url of DICE_NYC_URLS) {
    try {
      const res = await fetch(url, { headers: DICE_FETCH_HEADERS });
      if (!res.ok) {
        lastError = new Error("Dice fetch " + res.status + " for " + url);
        continue;
      }
      const html = await res.text();
      let events = extractEventsFromHtml(html, url);
      if (events.length === 0) continue;
      const needTime = events.filter(function (e) { return !e.time; });
      const maxFetch = 10;
      for (let i = 0; i < Math.min(needTime.length, maxFetch); i++) {
        const ev = needTime[i];
        const details = await fetchEventDetails(ev.link);
        if (details) {
          if (details.time) ev.time = details.time;
          if (details.venue && !ev.neighborhood) ev.neighborhood = details.venue;
          if (details.price && !ev.price) ev.price = details.price;
        }
        await sleep(80);
      }
      return events;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Dice fetch failed for all URLs");
}

async function pushToEventsApi(events) {
  const base = getEnv("EVENTS_API_URL").replace(/\/$/, "");
  const url = base + "/api/events";
  const headers = { "Content-Type": "application/json" };
  let inserted = 0;
  let skipped = 0;
  for (const ev of events) {
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(ev) });
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (Array.isArray(data) ? data.length : data) inserted++;
        else skipped++;
      } else skipped++;
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
  if (process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true") {
    console.log("DRY_RUN: not pushing to API. Sample events:");
    events.slice(0, 5).forEach((e, i) => console.log(" ", i + 1, e.title, e.date, e.link));
    return;
  }
  try {
    const result = await pushToEventsApi(events);
    console.log("Inserted:", result.inserted, "Skipped (duplicate):", result.skipped);
  } catch (e) {
    console.error("Events API push failed:", e.message);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { main, scrapeDiceNy };
