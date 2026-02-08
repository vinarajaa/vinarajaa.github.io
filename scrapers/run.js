/**
 * Entry point for NYC events scrapers.
 * Run: EVENTS_API_URL=https://your-project.vercel.app node run.js
 */
const diceNy = require("./dice-nyc.js");
const eventbriteNy = require("./eventbrite-nyc.js");
const crowdvoltNy = require("./crowdvolt-nyc.js");

function liveLine(msg) {
  process.stdout.write("\r\u001b[K" + msg);
}

async function run() {
  const opts = {
    onProgress: function (platform, count, detail) {
      var s = platform + ": " + count + " events";
      if (detail) s += " (" + detail + ")";
      liveLine(s);
    }
  };
  await diceNy.main(opts);
  process.stdout.write("\n");
  await eventbriteNy.main(opts);
  process.stdout.write("\n");
  await crowdvoltNy.main(opts);
  process.stdout.write("\n");
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
