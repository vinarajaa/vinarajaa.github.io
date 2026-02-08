#!/usr/bin/env node
/**
 * Debug script: fetch one event URL (Dice or Eventbrite), save HTML to debug-event.html, and print what we parse.
 *
 * Usage:
 *   node debug-one-event.js "https://dice.fm/event/xxxx"
 *   node debug-one-event.js "https://www.eventbrite.com/e/xxxx"
 *   DEBUG_EVENT_URL="https://..." node debug-one-event.js
 *
 * Supports either Dice or Eventbrite; HTML is always saved to debug-event.html (in current directory).
 */

const url = process.env.DEBUG_EVENT_URL || process.argv[2];
if (!url) {
  console.error("Usage: node debug-one-event.js <event-url>");
  console.error("  Event URL can be Dice (dice.fm) or Eventbrite (eventbrite.com).");
  console.error("  Or: DEBUG_EVENT_URL=<url> node debug-one-event.js");
  process.exit(1);
}

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const HEADERS = {
  dice: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://dice.fm/"
  },
  eventbrite: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.eventbrite.com/"
  }
};

const OUT_FILE = "debug-event.html";

async function main() {
  const isDice = url.includes("dice.fm");
  const isEventbrite = url.includes("eventbrite.com");
  if (!isDice && !isEventbrite) {
    console.error("URL must be from dice.fm or eventbrite.com");
    process.exit(1);
  }

  const platform = isDice ? "dice" : "eventbrite";
  const headers = HEADERS[platform];
  console.log("Fetching " + (isDice ? "Dice" : "Eventbrite") + " event:", url);

  const res = await fetch(url, { headers });
  const html = await res.text();
  const outPath = path.join(process.cwd(), OUT_FILE);
  fs.writeFileSync(outPath, html, "utf8");
  console.log("Saved HTML to", outPath, "(" + html.length + " chars)");

  let details;
  if (isDice) {
    const { fetchEventDetails } = require("./dice-nyc.js");
    details = await fetchEventDetails(url);
  } else {
    const { fetchEventbriteEventDetails } = require("./eventbrite-nyc.js");
    details = await fetchEventbriteEventDetails(url);
  }

  console.log("\n--- Parsed data ---");
  console.log(JSON.stringify(details, null, 2));
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
