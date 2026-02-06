/**
 * NYC area/address helpers for scrapers.
 * - Store actual address from the event.
 * - Derive neighborhood = area name only (Williamsburg, Flatiron, etc.), never "New York" or "Brooklyn" alone.
 */

// NYC zip code → area (Manhattan 100xx, Brooklyn 112xx, Queens 111xx, etc.)
const ZIP_TO_AREA = {
  "10001": "Chelsea", "10002": "Lower East Side", "10003": "East Village", "10004": "Financial District",
  "10005": "Financial District", "10006": "Financial District", "10007": "TriBeCa", "10009": "East Village",
  "10010": "Gramercy", "10011": "Chelsea", "10012": "SoHo", "10013": "TriBeCa", "10014": "West Village",
  "10016": "Midtown", "10017": "Midtown East", "10018": "Midtown", "10019": "Midtown",
  "10020": "Midtown", "10021": "Upper East Side", "10022": "Midtown East", "10023": "Upper West Side",
  "10024": "Upper West Side", "10025": "Upper West Side", "10026": "Harlem", "10027": "Harlem",
  "10028": "Upper East Side", "10029": "East Harlem", "10030": "Harlem", "10031": "Hamilton Heights",
  "10032": "Washington Heights", "10033": "Washington Heights", "10034": "Inwood", "10035": "East Harlem",
  "10036": "Midtown", "10037": "Harlem", "10038": "Financial District", "10039": "Harlem",
  "10040": "Washington Heights", "10044": "Roosevelt Island", "10065": "Upper East Side", "10069": "Midtown West",
  "10075": "Upper East Side",
  "11201": "Brooklyn Heights", "11203": "Flatbush", "11204": "Bay Ridge", "11205": "Fort Greene",
  "11206": "Williamsburg", "11209": "Bay Ridge", "11211": "Williamsburg", "11215": "Park Slope",
  "11216": "Bed-Stuy", "11217": "Boerum Hill", "11218": "Kensington", "11219": "Borough Park",
  "11220": "Sunset Park", "11221": "Bushwick", "11222": "Greenpoint", "11225": "Crown Heights",
  "11226": "Flatbush", "11231": "Red Hook", "11233": "Bed-Stuy", "11235": "Sheepshead Bay",
  "11237": "Bushwick", "11238": "Clinton Hill", "11249": "Williamsburg",
  "11101": "Long Island City", "11102": "Astoria", "11103": "Astoria", "11104": "Astoria",
  "11105": "Astoria", "11106": "Long Island City", "11354": "Flushing", "11355": "Flushing",
  "11372": "Jackson Heights", "11373": "Jackson Heights", "11374": "Rego Park", "11375": "Forest Hills",
  "11377": "Woodside", "11378": "Maspeth", "11379": "Middle Village", "11385": "Ridgewood",
  "10451": "South Bronx", "10452": "South Bronx", "10453": "University Heights", "10454": "Hunts Point",
  "10455": "Mott Haven", "10456": "Morrisania", "10457": "Tremont", "10458": "Fordham",
  "10459": "Bronx Park", "10460": "Belmont", "10461": "Riverdale", "10462": "Westchester Square",
  "10463": "Riverdale", "10467": "Norwood", "10468": "Kingsbridge", "10469": "Pelham Bay",
  "10301": "St. George", "10302": "Port Richmond", "10303": "St. George", "10304": "Tottenville",
  "10305": "Stapleton", "10306": "Tottenville", "10307": "Tottenville", "10308": "Tottenville",
  "10309": "Eltingville", "10310": "New Brighton", "10312": "Eltingville", "10314": "Great Kills"
};

/**
 * Get area name from NYC zip code (5-digit string).
 */
function getAreaFromZip(zipStr) {
  if (!zipStr || typeof zipStr !== "string") return null;
  const z = zipStr.trim().slice(0, 5);
  return ZIP_TO_AREA[z] || null;
}

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
 * - neighborhood: derived area name only (e.g. "Williamsburg", "Murray Hill"), or cleaned venue name without borough, or null.
 * When raw contains a NYC zip (e.g. "10016"), neighborhood is taken from zip map so "415 5th Ave New York, NY 10016" → area "Murray Hill".
 */
function deriveAddressAndArea(venueOrAddressStr) {
  const raw = (venueOrAddressStr && String(venueOrAddressStr).trim()) || "";
  const address = raw.slice(0, 300) || null;

  // If we have a street-style address with NYC zip, use zip to set area (so address stays full, area is neighborhood)
  const zipMatch = raw.match(/\b(100\d{2}|101\d{2}|102\d{2}|111\d{2}|112\d{2}|113\d{2}|104\d{2}|103\d{2})\b/);
  if (zipMatch) {
    const areaFromZip = getAreaFromZip(zipMatch[1]);
    if (areaFromZip) return { address, neighborhood: areaFromZip };
  }

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

module.exports = { deriveAddressAndArea, findAreaInText, stripBoroughPrefix, getAreaFromZip, NYC_AREAS, ZIP_TO_AREA };
