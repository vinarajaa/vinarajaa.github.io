/**
 * Dice.fm NYC events scraper.
 * Fetches Dice.fm NYC and parses event cards into our schema.
 * Requires: EVENTS_API_URL (your Vercel deployment, e.g. https://your-project.vercel.app) in env.
 */
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { deriveAddressAndArea } = require("./nyc-areas.js");

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
    const { address, neighborhood } = deriveAddressAndArea(venueStr || null);
    events.push({
      title,
      date,
      time: normalizeTime(timeStr),
      address: address || null,
      neighborhood: neighborhood || null,
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
          const addr = ev.venue?.address || ev.address;
          let venueAddr = null;
          if (addr && typeof addr === "object") {
            const p = [addr.address_line_1 || addr.street, addr.city, addr.region].filter(Boolean);
            if (p.length) venueAddr = p.join(", ");
          } else if (addr && typeof addr === "string") venueAddr = addr;
          const venueOrAddress = venueAddr || venue;
          const { address, neighborhood } = deriveAddressAndArea(venueOrAddress || null);
          const price = ev.price || ev.price_display || (ev.free ? "Free" : null);
          events.push({
            title,
            date,
            time: time ? String(time).slice(0, 50) : null,
            address: address || null,
            neighborhood: neighborhood || null,
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

/** Extract address string from a venue-like object (various API shapes). */
function venueAddressFromObj(v) {
  if (!v || typeof v !== "object") return null;
  const s = v.localized_address_display || v.formatted_address || v.full_address || v.display_address || (typeof v.address === "string" ? v.address : null);
  if (s && /\d{5}/.test(s)) return s.trim().slice(0, 300);
  if (v.address_lines && Array.isArray(v.address_lines)) {
    const joined = v.address_lines.filter(Boolean).join(", ").trim();
    if (joined && /\d{5}/.test(joined)) return joined.slice(0, 300);
  }
  const parts = [
    v.address_line_1 || (v.address && v.address.address_line_1) || (v.address && v.address.street),
    v.city || (v.address && v.address.city),
    v.region || (v.address && v.address.region) || (v.address && v.address.state),
    v.postal_code || (v.address && v.address.postal_code)
  ].filter(Boolean);
  if (parts.length >= 2) return parts.join(", ").slice(0, 300);
  return null;
}

/** Recursively find venue address in __NEXT_DATA__ (event.venue or nested). */
function findVenueAddressInJson(obj, depth) {
  if (depth > 10) return null;
  if (!obj) return null;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const r = findVenueAddressInJson(obj[i], depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === "object") {
    const addr = venueAddressFromObj(obj);
    if (addr) return addr;
    if (obj.venue) {
      const a = venueAddressFromObj(obj.venue);
      if (a) return a;
    }
    for (const k in obj) {
      const r = findVenueAddressInJson(obj[k], depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/** Recursively find any string in JSON that looks like a NYC address (has ", NY " and 5-digit zip). */
function findAddressStringInJson(obj, depth) {
  if (depth > 15) return null;
  if (typeof obj === "string") {
    const s = obj.trim();
    if (s.length >= 15 && s.length <= 300 && /,\s*NY\s*\d{5}/.test(s) && /\d+/.test(s) && !/^https?:\/\//i.test(s)) return s;
    return null;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const r = findAddressStringInJson(obj[i], depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (obj && typeof obj === "object") {
    for (const k in obj) {
      const r = findAddressStringInJson(obj[k], depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/** Extract first NYC-style address from text (number + street, City, NY zip). Handles newline-separated lines. */
function extractAddressFromText(text) {
  if (!text || typeof text !== "string") return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  var re = /\d+[\s\w.\-]*(?:Avenue|Ave|Street|St|Blvd|Boulevard|Road|Rd|Drive|Dr|Place|Pl|Way|Lane|Ln|Court|Ct)[^,]*,\s*[^,]+,\s*NY\s*\d{5}(?:\s*,?\s*USA)?/i;
  var m = normalized.match(re);
  if (m && m[0]) return m[0].trim().slice(0, 300);
  re = /\d+\s+[\w\s.\-]+,\s*[^,]+,\s*NY\s*\d{5}(?:\s*,?\s*USA)?/i;
  m = normalized.match(re);
  if (m && m[0]) return m[0].trim().slice(0, 300);
  re = /([^,]*,\s*[^,]+,\s*NY\s*\d{5}(?:\s*,?\s*USA)?)/i;
  m = normalized.match(re);
  if (m && m[1]) {
    var addr = m[1].trim();
    var numMatch = addr.match(/^(\d+[\s\w.\-]*)/);
    if (numMatch && addr.length >= 15 && addr.length <= 300) return addr.slice(0, 300);
  }
  return null;
}

/** Fetch event detail page and extract time, venue, address, and price from Venue section and __NEXT_DATA__ */
async function fetchEventDetails(link) {
  try {
    const res = await fetch(link, { headers: DICE_FETCH_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    let time = null;
    let venue = null;
    let address = null;
    let price = null;

    $('script#__NEXT_DATA__').each(function () {
      try {
        const data = JSON.parse($(this).html());
        const event = data.props && (data.props.pageProps && data.props.pageProps.event || data.props.pageProps && data.props.pageProps.initialEvent) || data.event || (data.props && data.props.event);
        if (!event) return;
        if (event.start && typeof event.start === "string" && event.start.includes("T")) {
          const t = event.start.slice(11, 16);
          if (t !== "00:00") time = t;
        }
        if (event.doors_open) time = time || String(event.doors_open).slice(0, 50);
        if (event.event_times && event.event_times[0]) time = time || String(event.event_times[0]).slice(0, 50);
        if (event.venue && event.venue.name) venue = event.venue.name.slice(0, 200);
        if (event.venue_name) venue = venue || String(event.venue_name).slice(0, 200);
        const v = event.venue;
        if (v) {
          const addr = venueAddressFromObj(v) || findVenueAddressInJson(data, 0);
          if (addr) address = addr;
        }
        if (!address) {
          const anyAddr = findAddressStringInJson(data, 0);
          if (anyAddr) address = anyAddr.slice(0, 300);
        }
        if (event.price_display) price = String(event.price_display).slice(0, 100);
        if (event.free && !price) price = "Free";
      } catch (_) {}
    });

    if (!address) {
      var candidate = extractAddressFromText($("body").text());
      if (candidate) address = candidate;
    }
    if (!address) {
      var bodyText = $("body").text();
      var parts = bodyText.split(/\bVenue\b/i);
      for (var p = 1; p < parts.length; p++) {
        candidate = extractAddressFromText(parts[p].slice(0, 1000));
        if (candidate) { address = candidate; break; }
      }
    }
    if (!address) {
      $("button[aria-label*='opy'], button[aria-label*='lipboard'], [class*='copy'], [data-testid*='copy']").each(function () {
        if (address) return;
        const btn = $(this);
        var text = btn.prev().text();
        if (!text || text.length < 15) text = btn.parent().text();
        candidate = extractAddressFromText(text);
        if (candidate) address = candidate;
      });
    }
    if (!address) {
      $("p, span, div").each(function () {
        if (address) return;
        const t = $(this).clone().children().remove().end().text();
        candidate = extractAddressFromText(t);
        if (candidate) {
          var inVenue = $(this).closest("[class*='venue'], [class*='Venue'], [class*='location'], [class*='Location']").length;
          if (inVenue || candidate.length > 25) address = candidate;
        }
      });
    }
    if (!address) {
      $("h1, h2, h3, h4, h5, h6, strong, [class*='venue'], [class*='Venue']").each(function () {
        if (address) return;
        const el = $(this);
        const labelText = el.clone().children().remove().end().text().trim();
        if (!/Venue/i.test(labelText)) return;
        const block = el.closest("section, div, [class*='venue'], [class*='Venue'], [class*='location']").length ? el.closest("section, div, [class*='venue'], [class*='Venue'], [class*='location']") : el.parent().parent();
        candidate = extractAddressFromText(block.text());
        if (candidate) address = candidate;
      });
    }
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
    return { time, venue, address, price };
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

      function hasStreetAddress(ev) {
        const a = (ev.address || "").trim();
        return a.length > 10 && /\d{5}/.test(a);
      }
      const needAddress = events.filter(function (e) { return !hasStreetAddress(e); });
      const needTime = events.filter(function (e) { return !e.time; });
      const needDetails = [];
      const seen = new Set();
      needAddress.forEach(function (e) {
        if (!seen.has(e.link)) { seen.add(e.link); needDetails.push(e); }
      });
      needTime.forEach(function (e) {
        if (!seen.has(e.link)) { seen.add(e.link); needDetails.push(e); }
      });

      const maxFetchFirst = 60;
      var fetched = new Set();
      function applyDetails(ev, details) {
        if (!details) return;
        if (details.time) ev.time = details.time;
        if (details.address && /\d{5}/.test(details.address)) {
          const out = deriveAddressAndArea(details.address);
          if (out.address) ev.address = out.address;
          if (out.neighborhood) ev.neighborhood = out.neighborhood;
        } else if (details.venue && !ev.neighborhood) {
          const out = deriveAddressAndArea(details.venue);
          if (out.neighborhood) ev.neighborhood = out.neighborhood;
        }
        if (details.price && !ev.price) ev.price = details.price;
      }
      for (var i = 0; i < Math.min(needDetails.length, maxFetchFirst); i++) {
        const ev = needDetails[i];
        fetched.add(ev.link);
        const details = await fetchEventDetails(ev.link);
        applyDetails(ev, details);
        await sleep(90);
      }
      var stillNeedAddress = events.filter(function (e) { return !hasStreetAddress(e) && !fetched.has(e.link); });
      var maxFetchSecond = 40;
      for (var j = 0; j < Math.min(stillNeedAddress.length, maxFetchSecond); j++) {
        const ev = stillNeedAddress[j];
        const details = await fetchEventDetails(ev.link);
        applyDetails(ev, details);
        await sleep(90);
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
