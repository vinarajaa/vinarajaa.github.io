/**
 * Entry point for NYC events scrapers.
 * Run: EVENTS_API_URL=https://your-project.vercel.app node run.js
 */
const diceNy = require("./dice-nyc.js");
const eventbriteNy = require("./eventbrite-nyc.js");
const crowdvoltNy = require("./crowdvolt-nyc.js");

async function run() {
  const opts = {};
  await diceNy.main(opts);
  await eventbriteNy.main(opts);
  await crowdvoltNy.main(opts);
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
