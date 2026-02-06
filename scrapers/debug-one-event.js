#!/usr/bin/env node
/**
 * Debug script: fetch one event URL, save HTML to debug-event.html, and print what we parse.
 * Usage:
 *   node debug-one-event.js "https://dice.fm/event/xxxx"
 *   node debug-one-event.js "https://www.eventbrite.com/e/xxxx"
 *   DEBUG_EVENT_URL="https://..." node debug-one-event.js
 *
 * Writes raw HTML to debug-event.html in the current directory (run from scrapers/).
 */

const url = process.env.DEBUG_EVENT_URL || process.argv[2];
if (!url) {
  console.error("Usage: node debug-one-event.js <event-url>");
  console.error("   or: DEBUG_EVENT_URL=<url> node debug-one-event.js");
  process.exit(1);
}

const fs = require("fs");
const path = require("path");

const DICE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Referer": "https://dice.fm/"
};
const EVENTBRITE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Referer": "https://www.eventbrite.com/"
};

async function main() {
  if (url.includes("dice.fm")) {
    const fetch = require("node-fetch");
    console.log("Fetching Dice event:", url);
    const res = await fetch(url, { headers: DICE_HEADERS });
    const html = await res.text();
    const outPath = path.join(process.cwd(), "debug-event.html");
    fs.writeFileSync(outPath, html, "utf8");
    console.log("Saved HTML to", outPath, "(" + html.length + " chars)");
    const { fetchEventDetails } = require("./dice-nyc.js");
    const details = await fetchEventDetails(url);
    console.log("\n--- Parsed data ---");
    console.log(JSON.stringify(details, null, 2));
    return;
  }

  if (url.includes("eventbrite.com")) {
    const fetch = require("node-fetch");
    console.log("Fetching Eventbrite event:", url);
    const res = await fetch(url, { headers: EVENTBRITE_HEADERS });
    const html = await res.text();
    const outPath = path.join(process.cwd(), "debug-event.html");
    fs.writeFileSync(outPath, html, "utf8");
    console.log("Saved HTML to", outPath, "(" + html.length + " chars)");
    const { fetchEventbriteEventDetails } = require("./eventbrite-nyc.js");
    const details = await fetchEventbriteEventDetails(url);
    console.log("\n--- Parsed data ---");
    console.log(JSON.stringify(details, null, 2));
    return;
  }

  console.error("URL must be from dice.fm or eventbrite.com");
  process.exit(1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
