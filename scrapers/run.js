/**
 * Entry point for NYC events scrapers.
 * Run: SUPABASE_URL=... SUPABASE_ANON_KEY=... node run.js
 * Add more platforms by requiring other scraper modules and calling their main().
 */
const diceNy = require("./dice-nyc.js");

async function run() {
  await diceNy.main();
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
