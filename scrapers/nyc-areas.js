/**
 * NYC area/address helpers for scrapers.
 * - Store actual address from the event.
 * - Derive neighborhood = area name only (Williamsburg, Flatiron, etc.), never "New York" or "Brooklyn" alone.
 */

// Known NYC neighborhood/area names (longer first so "East Village" beats "East")
const NYC_AREAS = [
  "Washington Heights", "Upper East Side", "Upper West Side", "East Village", "West Village",
  "Greenwich Village", "Hell's Kitchen", "Kips Bay", "Tudor City", "Stuyvesant Town",
  "Flatiron", "Chelsea", "SoHo", "TriBeCa", "NoHo", "NoLita", "Little Italy", "Chinatown",
  "Financial District", "Battery Park", "Midtown East", "Midtown West", "Midtown",
  "Murray Hill", "Gramercy", "Union Square", "Garment District", "Theater District",
  "Williamsburg", "Greenpoint", "Bushwick", "Bed-Stuy", "Bedford-Stuyvesant",
  "Park Slope", "Brooklyn Heights", "Carroll Gardens", "Cobble Hill", "Boerum Hill",
  "Prospect Heights", "Crown Heights", "Fort Greene", "Clinton Hill", "DUMBO",
  "Downtown Brooklyn", "Red Hook", "Gowanus", "Sunset Park", "Bay Ridge",
  "Coney Island", "Sheepshead Bay", "Brighton Beach", "Astoria", "Long Island City",
  "Sunnyside", "Woodside", "Jackson Heights", "Elmhurst", "Flushing", "Forest Hills",
  "Ridgewood", "Jamaica", "Harlem", "Morningside Heights", "Hamilton Heights",
  "South Bronx", "Mott Haven", "Port Morris", "Hunts Point", "University Heights",
  "St. George", "Stapleton", "Tottenville"
].sort(function (a, b) { return b.length - a.length; });

const BOROUGH_NAMES = /^(New York City?|NYC|Brooklyn|Manhattan|Queens|Bronx|Staten Island)\s*·?\s*$/i;

/**
 * Strip borough-only prefix so we don't show "New York" or "Brooklyn" as the venue/area.
 * Returns the rest (venue name or address) or null if nothing left.
 */
function stripBoroughPrefix(str) {
  if (!str || typeof str !== "string") return null;
  let s = str.trim();
  s = s.replace(BOROUGH_NAMES, "").trim();
  s = s.replace(/^[·\s]+|[·\s]+$/g, "").trim();
  return s || null;
}

/**
 * Find first NYC area name mentioned in text (case-insensitive).
 */
function findAreaInText(text) {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();
  for (let i = 0; i < NYC_AREAS.length; i++) {
    const area = NYC_AREAS[i];
    const re = new RegExp("\\b" + area.replace(/'/g, "'?").replace(/\s+/g, "\\s+") + "\\b", "i");
    if (re.test(lower)) return area;
  }
  return null;
}

/**
 * Normalize for display: area only, no "New York" or "Brooklyn".
 * Returns { address, neighborhood }.
 * - address: full venue/address line (stored as-is, up to 300 chars).
 * - neighborhood: derived area name only (e.g. "Williamsburg", "Flatiron"), or cleaned venue name without borough, or null.
 */
function deriveAddressAndArea(venueOrAddressStr) {
  const raw = (venueOrAddressStr && String(venueOrAddressStr).trim()) || "";
  const address = raw.slice(0, 300) || null;

  const area = findAreaInText(raw);
  if (area) {
    return { address, neighborhood: area };
  }

  const withoutBorough = stripBoroughPrefix(raw);
  if (withoutBorough) {
    return { address, neighborhood: withoutBorough.slice(0, 200) };
  }

  if (raw) {
    const cleaned = raw
      .replace(/\b(New York City?|NYC|Brooklyn|Manhattan|Queens|Bronx|Staten Island)\b/gi, "")
      .replace(/\s*·\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 200);
    if (cleaned) return { address, neighborhood: cleaned };
  }

  return { address, neighborhood: null };
}

module.exports = { deriveAddressAndArea, findAreaInText, stripBoroughPrefix, NYC_AREAS };
