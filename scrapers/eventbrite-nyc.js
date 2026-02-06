/**
 * Eventbrite NYC events scraper.
 * Fetches https://www.eventbrite.com/d/ny--new-york/all-events/ and parses into our schema.
 */
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { deriveAddressAndArea } = require("./nyc-areas.js");

const EVENTBRITE_NYC_URLS = [
  "https://www.eventbrite.com/d/ny--new-york/all-events/",
  "https://www.eventbrite.com/d/ny-new-york/all-events/"
];
const PLATFORM = "Eventbrite";

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

function normalizeTime(str) {
  if (!str || typeof str !== "string") return null;
  return str.trim().slice(0, 50) || null;
}

/** Derive a readable title from Eventbrite URL slug: /e/event-name-tickets-123/ -> "Event Name" */
function titleFromEventUrl(href) {
  const match = href.match(/\/e\/([^/]+?)(?:-tickets-\d+)?\/?$/i) || href.match(/\/e\/([^/]+)/);
  if (!match || !match[1]) return null;
  const slug = match[1]
    .replace(/-tickets-\d+$/i, "")
    .replace(/-/g, " ")
    .trim();
  if (slug.length < 2) return null;
  return slug.replace(/\b\w/g, function (c) { return c.toUpperCase(); }).slice(0, 300);
}

function extractEventsFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  // Eventbrite event links: /e/event-name-tickets-123456/
  $('a[href*="/e/"]').each(function () {
    let href = $(this).attr("href");
    if (!href) return;
    href = href.split("?")[0].replace(/\/$/, "");
    if (!/\/e\/[^/]+-\d+/.test(href)) return;
    if (href.startsWith("//")) href = "https:" + href;
    if (href.startsWith("/")) href = "https://www.eventbrite.com" + href;
    if (!href.startsWith("https://www.eventbrite.com")) return;
    if (seen.has(href)) return;
    seen.add(href);

    const card = $(this).closest("[class*='card'], [class*='Card'], [class*='event'], [class*='Event'], li, article, [data-testid]");
    // Gather text from card and parents so we get date/time/venue/price (often in siblings)
    let block = (card.length ? card : $(this)).text();
    let el = $(this).parent();
    for (let i = 0; i < 5 && el.length; i++) {
      block += " " + el.text();
      el = el.parent();
    }
    const cardText = block.replace(/\s+/g, " ").trim();

    const titleEl = card.length ? card.find("h2, h3, h4, [class*='title'], [class*='Title'], [data-testid*='title']").first() : $(this);
    let title = (titleEl.text() || $(this).text()).trim().slice(0, 300);
    if (!title || /^(event|tickets|save|share)$/i.test(title)) title = titleFromEventUrl(href) || title;
    if (!title || /tickets|eventbrite|log in|sign up/i.test(title)) title = titleFromEventUrl(href) || "Event";

    let dateStr = null;
    let timeStr = null;
    let venueStr = null;
    let priceStr = null;

    // Time: "5:00 AM", "10:30 PM", "7:30 PM", "at 11:00 AM"
    const timeMatch = cardText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i) || cardText.match(/(\d{1,2}\s*[AP]M)/i);
    if (timeMatch) timeStr = timeMatch[1].trim().replace(/\s+/g, " ").slice(0, 50);

    // "Fri, Feb 13, 5:00 AM" or "Wed, Feb 12, 4:00 PM"
    const fullDateMatch = cardText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(\w+)\s+(\d{1,2}),?\s*(\d{1,2}:\d{2}\s*[AP]M)?/i);
    if (fullDateMatch) {
      const datePart = fullDateMatch[2] + " " + fullDateMatch[3] + (fullDateMatch[4] ? " " + fullDateMatch[4] : "");
      let d = new Date(datePart);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        if (d.getFullYear() < now.getFullYear()) {
          d.setFullYear(now.getFullYear());
          if (d < now) d.setFullYear(now.getFullYear() + 1);
        }
        dateStr = d.toISOString().slice(0, 10);
        if (!timeStr && fullDateMatch[4]) timeStr = fullDateMatch[4].trim().slice(0, 50);
      } else dateStr = datePart;
    }
    if (!dateStr && /(Today|Tomorrow)\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i.test(cardText)) {
      const rel = cardText.match(/(Today|Tomorrow)\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i);
      if (rel) {
        const today = new Date();
        if (/Tomorrow/i.test(rel[1])) today.setDate(today.getDate() + 1);
        dateStr = today.toISOString().slice(0, 10);
        if (!timeStr) timeStr = rel[2].trim();
      }
    }
    if (!dateStr) {
      const anyDate = cardText.match(/(\d{4})-(\d{2})-(\d{2})/) || cardText.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
      if (anyDate) dateStr = anyDate[0];
    }

    // Venue: "Brooklyn · MAMATACO", "New York · TBA" — then strip "Share this event", "Save this event", "Almost full", etc.
    const venueMatch = cardText.match(/(Brooklyn|Manhattan|Queens|Bronx|Staten Island|New York City?|NYC)\s*·\s*([^·\n]+?)(?=\s*Save|\s*Share|$|\d{1,2}:\d{2})/im)
      || cardText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*·\s*([A-Z0-9][A-Za-z0-9\s&'-]+?)(?=\s*Save|\s*Share|$)/m);
    if (venueMatch) {
      venueStr = (venueMatch[1].trim() + " · " + venueMatch[2].trim())
        .replace(/Promoted/gi, "")
        .replace(/\w*\d+\s*followers\s*/gi, "")
        .replace(/([a-zA-Z])Free(?=[A-Z])/g, "$1")
        .replace(/\s*(?:From\s+\$[\d.]+\s*|Share\s+this\s+event[^\w]*|Save\s+this\s+event[^\w]*|Almost\s+full|Sales\s+end\s+soon|Going\s+fast).*$/i, "")
        .replace(/\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s*$/i, "")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 200);
    }

    // Price: "From $26.78", "Free", "From Free", "$39.14" — avoid "From $0.002" (treat as Free)
    const priceMatch = cardText.match(/(From\s+)?(\$[\d.]+|Free)/i);
    if (priceMatch) {
      const amount = (priceMatch[2] || "").trim();
      const from = priceMatch[1] ? priceMatch[1].trim() + " " : "";
      if (/^\$0(\.0+)?$/i.test(amount) || amount.toLowerCase() === "free") priceStr = from ? "From Free" : "Free";
      else priceStr = from + amount;
    }

    card.find("[datetime]").each(function () {
      const dt = $(this).attr("datetime");
      if (dt) {
        const d = new Date(dt);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10);
          const t = d.toTimeString().slice(0, 5);
          if (t !== "00:00" && !timeStr) timeStr = t;
        }
      }
    });
    if (!dateStr) {
      const anyDate = cardText.match(/(\d{4})-(\d{2})-(\d{2})/) || cardText.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
      if (anyDate) dateStr = anyDate[0];
    }
    if (!priceStr && /free|from \$|\$[\d.]+/i.test(cardText)) {
      const fromFree = cardText.match(/from\s+(free|\$[\d.]+)/i);
      const plainPrice = cardText.match(/\$[\d.]+/);
      if (fromFree) {
        const a = fromFree[1].trim();
        priceStr = /^\$0(\.0+)?$/i.test(a) ? "From Free" : "From " + a;
      } else if (plainPrice && !/^\$0(\.0+)?$/.test(plainPrice[0])) priceStr = plainPrice[0];
      else if (/free/i.test(cardText)) priceStr = "Free";
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

  // Try embedded JSON (Eventbrite may use Next.js or similar)
  $('script[type="application/json"]').each(function () {
    try {
      const data = JSON.parse($(this).html() || "{}");
      const list = data.props?.pageProps?.events || data.events || data.results || data?.data?.events || [];
      if (!Array.isArray(list)) return;
      list.forEach(function (ev) {
        const link = ev.url || ev.link || (ev.id ? "https://www.eventbrite.com/e/" + (ev.slug || ev.id) + "/" : null);
        if (!link || seen.has(link)) return;
        seen.add(link);
        const title = (ev.name || ev.title || ev.text || "Event").toString().slice(0, 300);
        let date = null;
        if (ev.start_date) date = ev.start_date.slice(0, 10);
        else if (ev.start) date = new Date(ev.start).toISOString().slice(0, 10);
        else if (ev.date) date = normalizeDate(ev.date);
        if (!date) return;
        let time = null;
        if (ev.start_time) time = String(ev.start_time).slice(0, 50);
        else if (ev.start && typeof ev.start === "string" && ev.start.includes("T")) {
          const t = ev.start.slice(11, 16);
          if (t !== "00:00") time = t;
        }
        const venue = ev.venue?.name || ev.venue_name || ev.location?.name || ev.location || ev.place || null;
        const addr = ev.venue?.address || ev.address || {};
        const addrParts = [
          addr.address_line_1 || addr.street || addr.line1,
          addr.city,
          addr.region || addr.state,
          addr.postal_code
        ].filter(Boolean);
        const fullAddress = addrParts.length ? addrParts.join(", ") : null;
        const venueOrAddress = fullAddress || [addr.city || addr.region, venue].filter(Boolean).join(" · ") || venue;
        const cleaned = (venueOrAddress && String(venueOrAddress).replace(/\bPromoted\b/gi, "").replace(/\s{2,}/g, " ").trim()) || null;
        const { address, neighborhood } = deriveAddressAndArea(cleaned);
        let price = ev.price_display || ev.price || (ev.is_free ? "Free" : null);
        if (price != null) price = String(price).slice(0, 100);
        events.push({
          title,
          date,
          time: time ? String(time).slice(0, 50) : null,
          address: address || null,
          neighborhood: neighborhood || null,
          price: price ? String(price).slice(0, 100) : null,
          link: link.startsWith("http") ? link : "https://www.eventbrite.com" + (link.startsWith("/") ? link : "/e/" + link),
          platform: PLATFORM
        });
      });
    } catch (_) {}
  });

  return events;
}

/** Fetch event detail page and extract full venue address (e.g. "415 5th Avenue New York, NY 10016"). */
async function fetchEventbriteEventDetails(link) {
  try {
    const res = await fetch(link, { headers: FETCH_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    let addressStr = null;
    let venueName = null;

    // JSON-LD Event with location.address (or @graph with Event + Place)
    $('script[type="application/ld+json"]').each(function () {
      try {
        const raw = $(this).html() || "{}";
        const data = JSON.parse(raw);
        const graph = data["@graph"] || (Array.isArray(data) ? data : [data]);
        const items = Array.isArray(graph) ? graph : [graph];
        for (let k = 0; k < items.length; k++) {
          const item = items[k];
          if (!item || item["@type"] !== "Event") continue;
          const loc = item.location;
          if (!loc) continue;
          const place = (loc["@id"] && items.find(function (x) { return x["@id"] === loc["@id"]; })) || loc;
          const addr = place.address || (place["@type"] === "Place" && place.address);
          if (addr) {
            if (typeof addr === "string") {
              addressStr = addr.trim().slice(0, 300);
            } else {
              const parts = [
                addr.streetAddress || addr.street,
                addr.addressLocality || addr.addressCity || addr.city,
                addr.addressRegion || addr.addressState || addr.region || addr.state,
                addr.postalCode || addr.zip
              ].filter(Boolean);
              if (parts.length) addressStr = parts.join(", ").slice(0, 300);
            }
            if (place.name) venueName = String(place.name).trim().slice(0, 200);
            break;
          }
        }
      } catch (_) {}
    });

    // Fallback: look for address in data attributes or common patterns
    if (!addressStr) {
      const addrEl = $("[data-testid='venue-address'], [data-automation='venue-address'], .venue-address, .event-venue-address, [class*='venueAddress']").first();
      if (addrEl.length) addressStr = addrEl.text().replace(/\s+/g, " ").trim().slice(0, 300);
    }
    if (!addressStr) {
      const bodyText = $("body").text().replace(/\s+/g, " ");
      const addrMatch = bodyText.match(/(\d+[\s\w\.]+(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Drive|Dr|Place|Pl|Way)[^·]*?,?\s*New York,?\s*NY\s*\d{5})/i)
        || bodyText.match(/(\d+[\s\w\.]+(?:Avenue|Ave|Street|St)[^·]*?,?\s*Brooklyn,?\s*NY\s*\d{5})/i);
      if (addrMatch) addressStr = addrMatch[1].trim().slice(0, 300);
    }

    return addressStr ? { address: addressStr, venueName: venueName } : null;
  } catch (_) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.eventbrite.com/"
};

async function scrapeEventbriteNy() {
  let lastError;
  for (const url of EVENTBRITE_NYC_URLS) {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) {
        lastError = new Error("Eventbrite fetch " + res.status + " for " + url);
        continue;
      }
      const html = await res.text();
      let events = extractEventsFromHtml(html, url);
      if (events.length === 0) continue;

      // For events that only have "City · Venue" (no street address), fetch detail page to get full address
      const needAddress = events.filter(function (e) {
        const a = (e.address || "").trim();
        return !a || a.indexOf("·") >= 0 && !/\d{5}/.test(a);
      });
      const maxFetch = 12;
      for (let i = 0; i < Math.min(needAddress.length, maxFetch); i++) {
        const ev = needAddress[i];
        const details = await fetchEventbriteEventDetails(ev.link);
        if (details && details.address) {
          const derived = deriveAddressAndArea(details.address);
          ev.address = derived.address;
          if (derived.neighborhood) ev.neighborhood = derived.neighborhood;
        }
        await sleep(120);
      }

      return events;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Eventbrite fetch failed for all URLs");
}

async function main() {
  console.log("Scraping Eventbrite NYC...");
  const events = await scrapeEventbriteNy();
  console.log("Found", events.length, "events");
  if (events.length === 0) return;
  if (process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true") {
    console.log("DRY_RUN: sample events:", events.slice(0, 3));
    return;
  }
  const base = process.env.EVENTS_API_URL;
  if (!base) {
    console.error("Set EVENTS_API_URL to push events");
    process.exit(1);
  }
  const apiUrl = base.replace(/\/$/, "") + "/api/events";
  let inserted = 0;
  for (const ev of events) {
    try {
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ev)
      });
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (Array.isArray(data) ? data.length : data) inserted++;
      }
    } catch (_) {}
  }
  console.log("Inserted:", inserted);
}

if (require.main === module) main();
module.exports = { main, scrapeEventbriteNy };
