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

const DETAIL_TIMEOUT_MS = 5000;
const DETAIL_CONCURRENCY = parseInt(process.env.CROWDVOLT_DETAIL_CONCURRENCY || "8", 10) || 8;

/** Fetch event detail page in a subprocess and kill after timeout so we never block the main process. */
function fetchCrowdvoltEventDetailsWithTimeout(link) {
  const timeoutMs = DETAIL_TIMEOUT_MS;
  const { spawn } = require("child_process");
  const scriptPath = __dirname + "/crowdvolt-nyc.js";

  return new Promise(function (resolve) {
    let settled = false;
    const onDone = function (result) {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch (_) {}
      resolve(result);
    };
    const child = spawn(process.execPath, [scriptPath, "--fetch-one", link], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: __dirname
    });
    let stdout = "";
    child.stdout.on("data", function (chunk) {
      stdout += chunk;
    });
    const timer = setTimeout(function () {
      try {
        child.kill("SIGKILL");
      } catch (_) {}
      onDone(null);
    }, timeoutMs);
    child.on("close", function (code) {
      clearTimeout(timer);
      if (settled) return;
      if (code === 0 && stdout.trim()) {
        try {
          onDone(JSON.parse(stdout.trim()));
          return;
        } catch (_) {}
      }
      onDone(null);
    });
    child.on("error", function () {
      clearTimeout(timer);
      onDone(null);
    });
  });
}

const MAX_DETAIL_HTML = 600000; // ~600KB so cheerio/parsing can't block event loop for long

/** Extract venue, time, price from any HTML fragment (listing card or detail page). */
function parseDetailsFromHtml(html) {
  const $ = cheerio.load(html.length > MAX_DETAIL_HTML ? html.slice(0, MAX_DETAIL_HTML) : html);
  let venueName = null;
  let time = null;
  let price = null;
  const bodyText = $("body").text().replace(/\s+/g, " ").trim() || $("div").first().text().replace(/\s+/g, " ").trim();
  const h2El = $("h2").first();
  if (h2El.length) {
    const h2Text = h2El.text().replace(/\s+/g, " ").trim();
    const parts = h2Text.split(/\s*•\s*/).map(function (p) {
      return p.trim();
    }).filter(Boolean);
    if (parts.length >= 2) {
      const timePart = parts.find(function (p) {
        return /^\d{1,2}:\d{2}\s*[AP]\.?M\.?$/i.test(p) || /^\d{1,2}[AP]\.?M\.?$/i.test(p);
      });
      if (timePart) time = timePart.slice(0, 50);
      if (parts.length >= 3) venueName = parts[parts.length - 1].slice(0, 200);
      else if (parts.length === 2 && !timePart) venueName = parts[1].slice(0, 200);
    }
  }
  if (!time && bodyText) {
    const timeM = bodyText.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i) || bodyText.match(/\b(\d{1,2}:\d{2})\b/);
    if (timeM) time = timeM[1].trim().slice(0, 50);
  }
  if (!venueName && bodyText) {
    $("[class*='venue'], [class*='Venue'], [class*='location'], [class*='Location']").each(function () {
      const t = $(this).text().trim();
      if (t.length > 2 && t.length < 150) {
        venueName = t.slice(0, 200);
        return false;
      }
    });
  }
  if (!venueName && bodyText.length > 20) {
    const venueLike = bodyText.match(/(?:at|@|\•)\s*([A-Za-z0-9\s&'\-]+?)(?:\s+[•·]\s+|\s+\d{1,2}:\d{2}|\s+\d{1,2}[AP]M|$)/i)
      || bodyText.match(/([A-Za-z0-9\s&'\-]+(?:Warehouse|Hall|Theater|Theatre|Club|Bar|Basement|Location))/i);
    if (venueLike && venueLike[1].length > 2) venueName = venueLike[1].trim().slice(0, 200);
  }
  const priceM = bodyText.match(/\$[\d,.]+/);
  if (priceM) price = priceM[0].slice(0, 100);
  return { venueName: venueName || null, time: time || null, price: price || null };
}

/** For one event link, get the listing card HTML fragment from the listing page and parse details from it. */
function getDetailsFromListingHtml(listingHtml, eventLink) {
  if (!listingHtml || !eventLink) return null;
  const $ = cheerio.load(listingHtml);
  const normalized = eventLink.split("?")[0].replace(/\/$/, "");
  const anchor = $('a[href*="/event/"]').filter(function () {
    const href = ($(this).attr("href") || "").split("?")[0].replace(/\/$/, "");
    const full = href.startsWith("http") ? href : "https://www.crowdvolt.com" + (href.startsWith("/") ? href : "/" + href);
    return full === normalized || full.endsWith(normalized) || normalized.endsWith(full.split("/event/")[1] || "");
  }).first();
  if (!anchor.length) return null;
  const card = anchor.closest("[class*='card'], [class*='Card'], [class*='event'], [class*='Event'], li, article, [data-testid], div");
  const fragment = (card.length ? card : anchor.parent()).toString().slice(0, 15000);
  return parseDetailsFromHtml(fragment);
}

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

    // CrowdVolt detail layout: h2 = "Fri, February 20 • 10PM • Brooklyn Warehouse Location"
    const h2El = $("h2").first();
    if (h2El.length) {
      const h2Text = h2El.text().replace(/\s+/g, " ").trim();
      const parts = h2Text.split(/\s*•\s*/).map(function (p) {
        return p.trim();
      }).filter(Boolean);
      if (parts.length >= 2) {
        const timePart = parts.find(function (p) {
          return /^\d{1,2}:\d{2}\s*[AP]\.?M\.?$/i.test(p) || /^\d{1,2}[AP]\.?M\.?$/i.test(p);
        });
        if (timePart) time = timePart.slice(0, 50);
        if (parts.length >= 3) venueName = parts[parts.length - 1].slice(0, 200);
        else if (parts.length === 2 && !timePart) venueName = parts[1].slice(0, 200);
      }
    }

    // Event image: img.crowdvolt.com in src/href/url (often URL-encoded)
    if (!image_url) {
      const imgCrowdvolt = html.match(/https?%3A%2F%2F(?:[^"'\s]*?)?img\.crowdvolt\.com%2F([^&"'\s]+)/i)
        || html.match(/https?:\/\/(?:[^"'\s]*?)?img\.crowdvolt\.com\/([^"'\s&]+)/i);
      if (imgCrowdvolt) {
        const path = imgCrowdvolt[1].replace(/%2F/g, "/").replace(/%3A/g, ":");
        image_url = ("https://img.crowdvolt.com/" + path).split("?")[0].slice(0, 500);
      }
    }
    if (!image_url) {
      $('link[rel="preload"][as="image"]').each(function () {
        const srcset = $(this).attr("imagesrcset") || $(this).attr("href");
        if (srcset && srcset.indexOf("crowdvolt") >= 0) {
          const decoded = decodeURIComponent(srcset.split("?")[0] || srcset);
          const first = (decoded.indexOf("http") >= 0 ? decoded : "https://" + decoded.replace(/^\/+/, "")).split(",")[0].replace(/\s+\d+w$/i, "").trim();
          if (first && first.indexOf("crowdvolt") >= 0) image_url = first.slice(0, 500);
        }
      });
    }

    const bodyText = $("body").text().replace(/\s+/g, " ");
    const zipMatch = bodyText.match(/\b(100\d{2}|111\d{2}|112\d{2}|113\d{2}|104\d{2}|103\d{2})\b/);
    if (zipMatch) {
      const addrMatch = bodyText.match(/(\d+[\s\w.\-]+(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Drive|Dr|Place|Pl)[^,]*,?\s*(?:New York|Brooklyn|Queens|Bronx|Manhattan),?\s*NY\s*\d{5})/i)
        || bodyText.match(/(\d+\s+[\w.\s\-]+(?:,?\s*[^,]+)*,\s*(?:New York|Brooklyn|Queens|Bronx),?\s*NY\s*\d{5})/i);
      if (addrMatch) address = normalizeAddressLine(addrMatch[1]) || addrMatch[1].trim().slice(0, 300);
    }
    if (!venueName) {
      $("[class*='venue'], [class*='Venue'], [class*='location'], [class*='Location'], [class*='address']").each(function () {
        const t = $(this).text().trim();
        if (t.length > 2 && t.length < 150) {
          if (/\d{5}/.test(t)) {
            if (!address) address = normalizeAddressLine(t) || t.slice(0, 300);
          } else {
            venueName = t.slice(0, 200);
            return false;
          }
        }
      });
    }
    if (!time) {
      const timeM = bodyText.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i) || bodyText.match(/\b(\d{1,2}:\d{2})\b/);
      if (timeM) time = timeM[1].trim().slice(0, 50);
    }
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

function filterSinceDate(events, sinceDate) {
  if (!sinceDate) return events;
  return events.filter(function (e) { return (e.date || "") >= sinceDate; });
}

async function scrapeCrowdvoltNy(opts) {
  const allEvents = [];
  const seenLinks = new Set();
  const sinceDate = (opts && opts.sinceDate) || null;
  let html = null;
  try {
    html = await fetchListingWithPuppeteer();
  } catch (_) {}
  if (html) {
    const events = extractEventsFromHtml(html, "https://www.crowdvolt.com/", null);
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
        const events = extractEventsFromHtml(h, listUrl, null);
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
  if (needDetails.length === 0) return allEvents;

  function applyDetails(ev, details) {
    if (!details) return;
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

  const concurrency = Math.min(DETAIL_CONCURRENCY, needDetails.length);
  for (let i = 0; i < needDetails.length; i += concurrency) {
    const batch = needDetails.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(function (ev) {
      return fetchCrowdvoltEventDetailsWithTimeout(ev.link).then(function (d) {
        return { ev: ev, details: d };
      });
    }));
    results.forEach(function (r) {
      applyDetails(r.ev, r.details);
    });
    if (i + concurrency < needDetails.length) await sleep(80);
  }

  if (html) {
    const stillNeed = allEvents.filter(function (e) {
      return !e.address || !e.time || !e.venue;
    });
    stillNeed.forEach(function (ev) {
      const fromListing = getDetailsFromListingHtml(html, ev.link);
      if (fromListing) applyDetails(ev, fromListing);
    });
  }

  return filterSinceDate(allEvents, sinceDate);
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

if (require.main === module) {
  const oneUrl = process.argv[2] === "--fetch-one" && process.argv[3];
  if (oneUrl) {
    fetchCrowdvoltEventDetails(oneUrl)
      .then(function (out) {
        console.log(JSON.stringify(out || null));
        process.exit(0);
      })
      .catch(function () {
        console.log("null");
        process.exit(1);
      });
    return;
  }
  main();
}
module.exports = { main, scrapeCrowdvoltNy, fetchCrowdvoltEventDetails };
