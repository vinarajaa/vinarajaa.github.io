/**
 * CrowdVolt NYC events scraper.
 * Fetches crowdvolt.com for event links and parses into our schema.
 */
// Prefer Node 18+ built-in fetch (better AbortSignal); fallback to node-fetch
const fetch = typeof globalThis.fetch === "function" ? globalThis.fetch : require("node-fetch");
const cheerio = require("cheerio");
const { deriveAddressAndArea, normalizeAddressLine } = require("./nyc-areas.js");

const CROWDVOLT_URLS = [
  "https://www.crowdvolt.com/",
  "https://www.crowdvolt.com/events",
  "https://www.crowdvolt.com/events/new-york"
];
const PLATFORM = "Crowdvolt";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.crowdvolt.com/"
};

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
  const now = new Date();
  let year = d.getFullYear();
  if (year < now.getFullYear()) {
    d.setFullYear(now.getFullYear());
    if (d < now) d.setFullYear(now.getFullYear() + 1);
  }
  return d.toISOString().slice(0, 10);
}

/** Derive title from event slug: "allycvt-brooklyn-steel-sat-feb-7-new-york" -> "Allycvt Brooklyn Steel" */
function titleFromSlug(slug) {
  if (!slug || typeof slug !== "string") return null;
  const stopWords = /^(sat|sun|mon|tue|wed|thu|fri|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}|new-york|new-york-city|nyc|brooklyn|queens|manhattan|bronx|tickets)$/i;
  const parts = slug.split("-").filter(function (p) {
    return p.length > 0 && !stopWords.test(p);
  });
  if (parts.length === 0) return null;
  const title = parts.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); }).join(" ");
  return title.slice(0, 300);
}

/** Parse date from slug like "sat-feb-7" or "feb-7" */
function dateFromSlug(slug) {
  if (!slug || typeof slug !== "string") return null;
  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const parts = slug.toLowerCase().split("-");
  let month = null;
  let day = null;
  for (let i = 0; i < parts.length; i++) {
    if (months[parts[i]] !== undefined) {
      month = months[parts[i]];
      const next = parseInt(parts[i + 1], 10);
      if (!isNaN(next) && next >= 1 && next <= 31) {
        day = next;
        break;
      }
    }
  }
  if (month == null || day == null) return null;
  const now = new Date();
  let year = now.getFullYear();
  const d = new Date(year, month - 1, day);
  if (d < now) d.setFullYear(year + 1);
  return d.toISOString().slice(0, 10);
}

function extractEventsFromHtml(html, baseUrl, onProgress) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  $('a[href*="/event/"]').each(function () {
    let href = $(this).attr("href");
    if (!href) return;
    href = href.split("?")[0].replace(/\/$/, "");
    if (href.startsWith("/")) href = "https://www.crowdvolt.com" + href;
    const pathAfterEvent = href.split("/event/")[1];
    if (!pathAfterEvent) return;
    const slug = pathAfterEvent.replace(/\//g, "-").trim();
    href = "https://www.crowdvolt.com/event/" + slug;
    if (!slug || slug.length < 2) return;
    if (seen.has(href)) return;
    seen.add(href);
    const title = titleFromSlug(slug) || "Event";
    const date = dateFromSlug(slug);

    const card = $(this).closest("[class*='card'], [class*='Card'], [class*='event'], [class*='Event'], li, article, [data-testid]");
    let dateStr = date;
    let timeStr = null;
    let venueStr = null;
    let priceStr = null;
    const cardText = (card.length ? card : $(this).parent()).text().replace(/\s+/g, " ").trim();

    const dateMatch = cardText.match(/(\d{4})-(\d{2})-(\d{2})/) || cardText.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
    if (dateMatch) dateStr = dateStr || (dateMatch[0].length === 10 ? dateMatch[0] : null);
    const timeMatch = cardText.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i) || cardText.match(/\b(\d{1,2}:\d{2})\b/);
    if (timeMatch) timeStr = timeMatch[1].trim().slice(0, 50);
    const priceMatch = cardText.match(/\$[\d,.]+/);
    if (priceMatch) priceStr = priceMatch[0].slice(0, 100);
    card.find("[class*='venue'], [class*='Venue'], [class*='location'], [class*='Location']").each(function () {
      const t = $(this).text().trim();
      if (t && !venueStr) venueStr = t.slice(0, 200);
    });
    if (!venueStr && cardText.length > 20) {
      const venueLike = cardText.match(/(?:at|@)\s+([A-Za-z0-9\s&'-]+?)(?:\s+-\s+|\s+\d|$)/i);
      if (venueLike && venueLike[1].length > 2) venueStr = venueLike[1].trim().slice(0, 200);
    }

    const finalDate = dateStr ? normalizeDate(dateStr) : (date ? normalizeDate(date) : new Date().toISOString().slice(0, 10));
    const { address, neighborhood } = deriveAddressAndArea(venueStr || null);
    const venueName = (venueStr && !/\d{5}/.test(venueStr)) ? venueStr.replace(/\s*·\s*.*/, "").trim().slice(0, 200) : null;

    const slugLower = slug.toLowerCase();
    const isNyc = /new-york|nyc|brooklyn|queens|manhattan|bronx|new-york-city/.test(slugLower) || (venueStr && /new york|nyc|brooklyn|queens|manhattan|bronx/i.test(venueStr));
    if (!isNyc) return;

    events.push({
      title,
      date: finalDate,
      time: timeStr || null,
      address: address || null,
      neighborhood: neighborhood || null,
      venue: venueName || null,
      price: priceStr || null,
      link: href,
      platform: PLATFORM
    });
    if (onProgress) onProgress(events.length);
  });

  return events;
}

/** Fetch event detail page with abort on timeout so we don't hang on slow URLs. */
function fetchCrowdvoltEventDetailsWithTimeout(link) {
  const timeoutMs = 6000;
  const controller = new AbortController();
  const timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs);

  const done = fetchCrowdvoltEventDetails(link, controller.signal)
    .then(function (result) {
      clearTimeout(timeoutId);
      return result;
    })
    .catch(function () {
      clearTimeout(timeoutId);
      return null;
    });

  // Hard cap: after 6s always return null even if abort didn't stop res.text() or parsing
  const hardTimeout = new Promise(function (resolve) {
    setTimeout(function () {
      console.warn("  (timeout after " + timeoutMs / 1000 + "s, skipping)");
      resolve(null);
    }, timeoutMs);
  });

  return Promise.race([done, hardTimeout]);
}

const MAX_DETAIL_HTML = 600000; // ~600KB so cheerio/parsing can't block event loop for long

async function fetchCrowdvoltEventDetails(link, signal) {
  try {
    const opts = { headers: FETCH_HEADERS };
    if (signal) opts.signal = signal;
    const res = await fetch(link, opts);
    if (!res.ok) return null;
    let html = await res.text();
    if (html.length > MAX_DETAIL_HTML) html = html.slice(0, MAX_DETAIL_HTML);
    const $ = cheerio.load(html);
    let address = null;
    let venueName = null;
    let time = null;
    let price = null;
    let image_url = null;

    const bodyText = $("body").text().replace(/\s+/g, " ");
    const zipMatch = bodyText.match(/\b(100\d{2}|111\d{2}|112\d{2}|113\d{2}|104\d{2}|103\d{2})\b/);
    if (zipMatch) {
      const addrMatch = bodyText.match(/(\d+[\s\w.\-]+(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Drive|Dr|Place|Pl)[^,]*,?\s*(?:New York|Brooklyn|Queens|Bronx|Manhattan),?\s*NY\s*\d{5})/i)
        || bodyText.match(/(\d+\s+[\w.\s\-]+(?:,?\s*[^,]+)*,\s*(?:New York|Brooklyn|Queens|Bronx),?\s*NY\s*\d{5})/i);
      if (addrMatch) address = normalizeAddressLine(addrMatch[1]) || addrMatch[1].trim().slice(0, 300);
    }
    $("[class*='venue'], [class*='Venue'], [class*='location'], [class*='Location'], [class*='address']").each(function () {
      const t = $(this).text().trim();
      if (t.length > 2 && t.length < 150 && !venueName) {
        if (/\d{5}/.test(t)) {
          if (!address) address = normalizeAddressLine(t) || t.slice(0, 300);
        } else {
          venueName = t.slice(0, 200);
        }
      }
    });
    $('link[rel="preload"][as="image"]').each(function () {
      const srcset = $(this).attr("imagesrcset") || $(this).attr("href");
      if (srcset && srcset.indexOf("http") >= 0) {
        const first = srcset.split(",")[0].replace(/\s+1x$/i, "").trim();
        if (first) image_url = first.slice(0, 500);
      }
    });
    const timeM = bodyText.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i) || bodyText.match(/\b(\d{1,2}:\d{2})\b/);
    if (timeM) time = timeM[1].trim().slice(0, 50);
    const priceM = bodyText.match(/\$[\d,.]+/);
    if (priceM) price = priceM[0].slice(0, 100);

    return {
      address: address || null,
      venueName: venueName || null,
      time: time || null,
      price: price || null,
      image_url: image_url || null
    };
  } catch (_) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

/** Fetch CrowdVolt events via Puppeteer. Single page load, short timeouts, optional NYC click. */
async function fetchListingWithPuppeteer() {
  const OVERALL_MS = 35000;
  const timeoutPromise = new Promise(function (_, reject) {
    setTimeout(function () { reject(new Error("CrowdVolt fetch timeout")); }, OVERALL_MS);
  });

  async function run() {
    let browser;
    const puppeteer = require("puppeteer");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"]
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(FETCH_HEADERS["User-Agent"]);
      await page.setDefaultNavigationTimeout(8000);
      await page.setDefaultTimeout(5000);

      await page.goto("https://www.crowdvolt.com/", { waitUntil: "domcontentloaded", timeout: 8000 });
      await page.waitForSelector('a[href*="/event/"]', { timeout: 5000 }).catch(function () {});

      const clicked = await page.evaluate(function () {
        var any = document.querySelectorAll("a, button, [role=button]");
        for (var j = 0; j < any.length; j++) {
          var t = (any[j].textContent || "").trim();
          if (t === "NYC" || t === "New York" || /^NYC\s*$/i.test(t)) {
            any[j].click();
            return true;
          }
        }
        return false;
      });
      if (clicked) {
        await sleep(1000);
        await page.waitForSelector('a[href*="/event/"]', { timeout: 4000 }).catch(function () {});
      }

      for (var scroll = 0; scroll < 15; scroll++) {
        var prevCount = await page.evaluate(function () {
          return document.querySelectorAll('a[href*="/event/"]').length;
        });
        await page.evaluate(function () {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await sleep(800);
        var nextCount = await page.evaluate(function () {
          return document.querySelectorAll('a[href*="/event/"]').length;
        });
        if (nextCount <= prevCount) break;
      }

      return await page.content();
    } finally {
      await browser.close();
    }
  }

  try {
    return await Promise.race([run(), timeoutPromise]);
  } catch (e) {
    return null;
  }
}

async function scrapeCrowdvoltNy(opts) {
  const allEvents = [];
  const seenLinks = new Set();

  const onProgress = opts && opts.onProgress ? function (c, d) { opts.onProgress("CrowdVolt", c, d); } : null;
  let html = null;
  try {
    html = await fetchListingWithPuppeteer();
  } catch (_) {}
  if (html) {
    const events = extractEventsFromHtml(html, "https://www.crowdvolt.com/", onProgress);
    for (const ev of events) {
      if (seenLinks.has(ev.link)) continue;
      seenLinks.add(ev.link);
      allEvents.push(ev);
    }
  }

  if (allEvents.length === 0) {
    for (const listUrl of CROWDVOLT_URLS) {
      try {
        const res = await fetch(listUrl, { headers: FETCH_HEADERS });
        if (!res.ok) continue;
        const h = await res.text();
        const events = extractEventsFromHtml(h, listUrl, onProgress);
        for (const ev of events) {
          if (seenLinks.has(ev.link)) continue;
          seenLinks.add(ev.link);
          allEvents.push(ev);
        }
      } catch (_) {}
    }
  }

  if (allEvents.length === 0) return allEvents;

  const needDetails = allEvents.filter(function (e) {
    return !e.address || !e.time || !e.venue;
  });
  const maxFetch = 30;
  for (let i = 0; i < Math.min(needDetails.length, maxFetch); i++) {
    const ev = needDetails[i];
    if (onProgress) onProgress(allEvents.length, "details " + (i + 1) + "/" + Math.min(needDetails.length, maxFetch));
    console.log("  → " + (i + 1) + "/" + Math.min(needDetails.length, maxFetch) + " " + ev.link);
    const details = await fetchCrowdvoltEventDetailsWithTimeout(ev.link);
    if (details) {
      if (details.venueName) ev.venue = String(details.venueName).slice(0, 200);
      if (details.address) {
        const derived = deriveAddressAndArea(details.address);
        ev.address = derived.address;
        if (derived.neighborhood) ev.neighborhood = derived.neighborhood;
      }
      if (details.time) ev.time = details.time;
      if (details.price && !ev.price) ev.price = details.price;
      if (details.image_url) ev.image_url = details.image_url;
    }
    await sleep(120);
  }

  return allEvents;
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

async function main(opts) {
  console.log("Scraping CrowdVolt NYC...");
  const events = await scrapeCrowdvoltNy(opts || {});
  console.log("Found", events.length, "events");
  if (events.length === 0) {
    console.log("No CrowdVolt events parsed.");
    return;
  }
  if (process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true") {
    console.log("DRY_RUN: sample events:", events.slice(0, 5).map(function (e) { return { title: e.title, date: e.date, link: e.link }; }));
    return;
  }
  const { inserted, skipped } = await pushToEventsApi(events);
  console.log("Inserted:", inserted, "Skipped (duplicate):", skipped);
}

if (require.main === module) main();
module.exports = { main, scrapeCrowdvoltNy, fetchCrowdvoltEventDetails };
