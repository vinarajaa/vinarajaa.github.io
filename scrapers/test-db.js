/**
 * Quick test: fetch events from the Vercel API to verify it and the DB.
 * Run: EVENTS_API_URL=https://your-project.vercel.app node test-db.js
 */
const fetch = require("node-fetch");

const base = process.env.EVENTS_API_URL;
if (!base) {
  console.error("Set EVENTS_API_URL (e.g. https://your-project.vercel.app)");
  process.exit(1);
}

const url = base.replace(/\/$/, "") + "/api/events";

async function test() {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) {
    console.error("Request failed:", res.status, await res.text());
    process.exit(1);
  }
  const rows = await res.json();
  console.log("Events in DB:", rows.length);
  if (rows.length > 0) {
    console.log("Sample:", rows.slice(0, 3));
  }
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
