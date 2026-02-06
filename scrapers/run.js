/**
 * Entry point for NYC events scrapers.
 * Run: EVENTS_API_URL=https://your-project.vercel.app node run.js
 */
const diceNy = require("./dice-nyc.js");
const eventbriteNy = require("./eventbrite-nyc.js");

async function run() {
  await diceNy.main();
  await eventbriteNy.main();
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
