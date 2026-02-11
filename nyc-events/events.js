// NYC Events – Vercel API only (or demo mode when not configured)
// Set EVENTS_API_URL to your Vercel deployment; leave empty for demo. See NYC_EVENTS_SETUP.md.
const EVENTS_API_URL = "https://vinarajaa-github-io.vercel.app";  // e.g. https://your-project.vercel.app
// Optional (for the “Pull from Dice” modal link)
const GITHUB_REPO = "vinarajaa/vinarajaa.github.io";
const GITHUB_WORKFLOW_FILE = "scrape-nyc-events.yml";

let eventsData = [];
var filteredEventsList = [];
let demoMode = false;
var DEMO_EVENTS = [
  { id: "demo-1", title: "Sample Show", date: "2025-02-15", time: "20:00", neighborhood: "Brooklyn", price: "$25", link: "https://dice.fm/example1", platform: "Dice", created_at: "2025-02-01T12:00:00Z" },
  { id: "demo-2", title: "Free Comedy Night", date: "2025-02-20", time: "19:30", neighborhood: "Manhattan", price: "Free", link: "https://dice.fm/example2", platform: "Dice", created_at: "2025-02-01T12:00:00Z" }
];

function get(id) { return document.getElementById(id); }

var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDateDisplay(val) {
  if (val == null || val === "") return "—";
  var d;
  if (val instanceof Date) {
    d = val;
  } else {
    var s = String(val).trim();
    var parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      d = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
    } else {
      d = new Date(s);
    }
  }
  if (isNaN(d.getTime())) return "—";
  return DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

/** Truncate price decimals to hundredth (2 places); drop the rest. */
function formatPriceDisplay(val) {
  if (val == null || val === "") return "—";
  var s = String(val).trim();
  return s.replace(/(\.\d{2})\d+/g, "$1");
}

function setStatus(text) {
  var el = get("events-status");
  if (el) el.textContent = text;
}

function eventsApiUrl() {
  var base = (EVENTS_API_URL || "").replace(/\/$/, "");
  return base ? base + "/api/events" : null;
}

async function fetchEvents() {
  var url = eventsApiUrl();
  if (!url) {
    demoMode = true;
    eventsData = DEMO_EVENTS.map(function (e) { return { ...e }; });
    return;
  }
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error("Events " + res.status);
    const data = await res.json();
    eventsData = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("Fetch events failed:", err);
    demoMode = true;
    eventsData = DEMO_EVENTS.map(function (e) { return { ...e }; });
  }
}

function todayYMD() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function endOfWeekYMD() {
  var d = new Date();
  var day = d.getDay();
  var add = day === 0 ? 6 : 7 - day;
  d.setDate(d.getDate() + add);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Parse time string to 0-23 hour (best effort). */
function parseTimeHour(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  var s = timeStr.trim();
  var m = s.match(/(\d{1,2})(?::(\d{2}))?\s*([AP])\.?M?/i);
  if (m) {
    var h = parseInt(m[1], 10);
    if ((m[3] || "").toUpperCase() === "P" && h < 12) h += 12;
    if ((m[3] || "").toUpperCase() === "A" && h === 12) h = 0;
    return h;
  }
  m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function setDateFilter(mode) {
  var fromEl = get("filterDateFrom");
  var toEl = get("filterDateTo");
  var rangeEl = get("dateRangeInputs");
  var today = todayYMD();
  var weekEnd = endOfWeekYMD();
  document.querySelectorAll(".date-filter-btn").forEach(function (btn) {
    btn.classList.remove("ring-2", "ring-offset-1");
    btn.style.boxShadow = "none";
  });
  if (mode === "today") {
    if (fromEl) fromEl.value = today;
    if (toEl) toEl.value = today;
    if (rangeEl) rangeEl.classList.add("hidden");
    var btn = get("dateBtnToday");
    if (btn) { btn.classList.add("ring-2", "ring-offset-1"); btn.style.boxShadow = "0 0 0 2px #710627"; }
  } else if (mode === "week") {
    if (fromEl) fromEl.value = today;
    if (toEl) toEl.value = weekEnd;
    if (rangeEl) rangeEl.classList.add("hidden");
    var btn = get("dateBtnWeek");
    if (btn) { btn.classList.add("ring-2", "ring-offset-1"); btn.style.boxShadow = "0 0 0 2px #710627"; }
  } else {
    if (rangeEl) rangeEl.classList.remove("hidden");
    var btn = get("dateBtnRange");
    if (btn) { btn.classList.add("ring-2", "ring-offset-1"); btn.style.boxShadow = "0 0 0 2px #710627"; }
  }
  applyEventFilters();
}

function applyClientFilters() {
  var dateFrom = (get("filterDateFrom") || {}).value;
  var dateTo = (get("filterDateTo") || {}).value;
  var neighborhood = (get("filterNeighborhood") || {}).value;
  var venue = (get("filterVenue") || {}).value;
  var platform = (get("filterPlatform") || {}).value;
  var price = (get("filterPrice") || {}).value;
  var search = ((get("filterSearch") || {}).value || "").trim().toLowerCase();
  var eventType = (get("filterEventType") || {}).value;
  var timeOfDay = (get("filterTimeOfDay") || {}).value;
  var list = eventsData.filter(function (e) {
    if (dateFrom && (e.date || "") < dateFrom) return false;
    if (dateTo && (e.date || "") > dateTo) return false;
    if (neighborhood && (e.neighborhood || "") !== neighborhood) return false;
    if (venue && (e.venue || "") !== venue) return false;
    if (platform && (e.platform || "") !== platform) return false;
    if (price === "free" && (e.price || "").toLowerCase().indexOf("free") < 0) return false;
    if (price === "paid" && !(e.price || "").trim()) return false;
    if (price === "paid" && (e.price || "").toLowerCase() === "free") return false;
    if (search) {
      var allText = [
        e.title, e.description, e.venue, e.neighborhood, e.address, e.time, e.price, e.platform,
        e.date ? formatDateDisplay(e.date) : ""
      ].filter(Boolean).join(" ").toLowerCase();
      if (allText.indexOf(search) < 0) return false;
    }
    if (eventType) {
      var text = ((e.title || "") + " " + (e.description || "")).toLowerCase();
      var match = false;
      if (eventType === "music") match = (text.indexOf("music") >= 0 || text.indexOf("concert") >= 0 || text.indexOf("dj") >= 0 || text.indexOf("live") >= 0);
      else if (eventType === "comedy") match = text.indexOf("comedy") >= 0;
      else if (eventType === "nightlife") match = (text.indexOf("night") >= 0 || text.indexOf("club") >= 0 || text.indexOf("party") >= 0 || text.indexOf("dance") >= 0);
      else if (eventType === "arts") match = (text.indexOf("art") >= 0 || text.indexOf("gallery") >= 0 || text.indexOf("theater") >= 0 || text.indexOf("theatre") >= 0);
      else if (eventType === "other") match = true;
      if (!match) return false;
    }
    if (timeOfDay) {
      var h = parseTimeHour(e.time);
      if (h == null) return true;
      if (timeOfDay === "daytime" && (h < 6 || h >= 18)) return false;
      if (timeOfDay === "late" && h >= 4 && h < 22) return false;
    }
    return true;
  });
  return list;
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderEventsTable(list) {
  var grid = get("eventsGrid");
  var emptyEl = get("eventsGridEmpty");
  if (!grid) return;
  if (!list || list.length === 0) {
    grid.innerHTML = "";
    if (emptyEl) {
      emptyEl.classList.remove("hidden");
    }
    return;
  }
  if (emptyEl) emptyEl.classList.add("hidden");
  filteredEventsList = list;
  grid.innerHTML = list.map(function (e, idx) {
    var dateVal = e.date;
    var dateStr = "—";
    if (dateVal != null && dateVal !== "") {
      var s = String(dateVal).trim();
      var parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (parts) {
        var d = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
        if (!isNaN(d.getTime())) dateStr = DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
        else dateStr = s.slice(0, 10);
      } else dateStr = s.slice(0, 10) || "—";
    }
    var time = e.time || "—";
    var venue = e.venue || "—";
    var neighborhood = e.neighborhood || "—";
    var price = formatPriceDisplay(e.price);
    var link = (e.link || "#").replace(/"/g, "&quot;");
    var title = escapeHtml(e.title || "Untitled");
    var id = escapeHtml(String(e.id || ""));
    var titleAttr = escapeHtml(e.title || "Untitled");
    var imgSrc = (e.image_url && e.image_url.indexOf("http") === 0) ? e.image_url.replace(/"/g, "&quot;") : "";
    var imgTag = imgSrc
      ? "<img class=\"event-card__image\" src=\"" + imgSrc + "\" alt=\"\" loading=\"lazy\">"
      : "<div class=\"event-card__image event-card__image--placeholder\"></div>";
    var metaParts = [];
    if (neighborhood !== "—") metaParts.push(escapeHtml(neighborhood));
    if (dateStr !== "—") metaParts.push(escapeHtml(dateStr));
    var metaLine = metaParts.length ? "<p class=\"event-card__meta\">" + metaParts.join(" · ") + "</p>" : "";
    return (
      "<article class=\"event-card\" data-event-id=\"" + id + "\" data-index=\"" + idx + "\" role=\"button\" tabindex=\"0\">" +
        "<div class=\"event-card__image-wrap\">" + imgTag + "</div>" +
        "<div class=\"event-card__title-wrap\"><h3 class=\"event-card__title\">" + title + "</h3>" + metaLine + "</div>" +
        "<div class=\"event-card__overlay\">" +
          "<div class=\"event-card__overlay-meta\">" +
            ((dateStr !== "—" || time !== "—") ? "<span>" + escapeHtml(dateStr) + (time !== "—" ? " · " + escapeHtml(time) : "") + "</span>" : "") +
            (venue !== "—" ? "<span>" + escapeHtml(venue) + "</span>" : "") +
            (neighborhood !== "—" ? "<span>" + escapeHtml(neighborhood) + "</span>" : "") +
            (price !== "—" ? "<span>" + escapeHtml(price) + "</span>" : "") +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }).join("");
  document.querySelectorAll(".event-card").forEach(function (card) {
    var idx = card.getAttribute("data-index");
    if (idx === null) return;
    card.addEventListener("click", function () { openEventModal(parseInt(idx, 10)); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEventModal(parseInt(card.getAttribute("data-index"), 10)); }
    });
  });
  if (typeof gsap !== "undefined") {
    gsap.fromTo(".event-card", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: "power2.out" });
    document.querySelectorAll(".event-card").forEach(function (card) {
      card.addEventListener("mouseenter", function () {
        gsap.to(card, { scale: 1.03, duration: 0.3, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", function () {
        gsap.to(card, { scale: 1, duration: 0.3, ease: "power2.out" });
      });
    });
  }
}

function populateFilterDropdowns() {
  var neighborhoods = [];
  var venues = [];
  var platforms = [];
  eventsData.forEach(function (e) {
    if (e.neighborhood && neighborhoods.indexOf(e.neighborhood) < 0) neighborhoods.push(e.neighborhood);
    if (e.venue && venues.indexOf(e.venue) < 0) venues.push(e.venue);
    if (e.platform && platforms.indexOf(e.platform) < 0) platforms.push(e.platform);
  });
  neighborhoods.sort();
  venues.sort();
  platforms.sort();
  var nhSelect = get("filterNeighborhood");
  if (nhSelect) {
    nhSelect.innerHTML = "<option value=\"\">All areas</option>" + neighborhoods.map(function (n) { return "<option value=\"" + n.replace(/"/g, "&quot;") + "\">" + n.replace(/</g, "&lt;") + "</option>"; }).join("");
  }
  var venSelect = get("filterVenue");
  if (venSelect) {
    venSelect.innerHTML = "<option value=\"\">All venues</option>" + venues.map(function (v) { return "<option value=\"" + v.replace(/"/g, "&quot;") + "\">" + v.replace(/</g, "&lt;") + "</option>"; }).join("");
  }
  var pfSelect = get("filterPlatform");
  if (pfSelect) {
    pfSelect.innerHTML = "<option value=\"\">All platforms</option>" + platforms.map(function (p) { return "<option value=\"" + p.replace(/"/g, "&quot;") + "\">" + p.replace(/</g, "&lt;") + "</option>"; }).join("");
  }
}

function applyEventFilters() {
  var list = applyClientFilters();
  renderEventsTable(list);
  setStatus(demoMode ? "Demo mode – " + list.length + " event(s). Set EVENTS_API_URL to use the Vercel backend." : list.length + " event(s).");
}

function setTimeFilter(value) {
  var hidden = get("filterTimeOfDay");
  if (hidden) hidden.value = value || "";
  document.querySelectorAll(".time-filter-btn").forEach(function (btn) {
    if ((btn.getAttribute("data-time") || "") === (value || "")) btn.classList.add("nav-btn--active");
    else btn.classList.remove("nav-btn--active");
  });
  applyEventFilters();
}

function toggleEventFilters() {
  var wrap = get("eventFilterWrap");
  var trigger = get("eventFilterTrigger");
  if (wrap) wrap.classList.toggle("is-open");
  var isOpen = wrap && wrap.classList.contains("is-open");
  if (trigger) trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  if (isOpen) setTimeout(function () { document.addEventListener("click", closeFilterPanelOnClick); }, 0);
  else document.removeEventListener("click", closeFilterPanelOnClick);
}
function closeFilterPanelOnClick(ev) {
  var wrap = get("eventFilterWrap");
  if (wrap && wrap.contains(ev.target)) return;
  if (wrap) wrap.classList.remove("is-open");
  var trigger = get("eventFilterTrigger");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  document.removeEventListener("click", closeFilterPanelOnClick);
}

function openEventModal(index) {
  var ev = filteredEventsList[index];
  if (!ev) return;
  var overlay = get("eventDetailModal");
  var titleEl = get("eventDetailModalTitle");
  var metaEl = get("eventDetailMeta");
  var descEl = get("eventDetailDescription");
  var imgEl = get("eventDetailImage");
  var linkEl = get("eventDetailLink");
  if (!overlay) return;
  var dateStr = formatDateDisplay(ev.date);
  var metaParts = [];
  if (dateStr && dateStr !== "—") metaParts.push(dateStr);
  if (ev.time) metaParts.push(ev.time);
  if (ev.venue) metaParts.push(ev.venue);
  if (ev.neighborhood) metaParts.push(ev.neighborhood);
  if (ev.address) metaParts.push(ev.address);
  if (ev.price) metaParts.push(formatPriceDisplay(ev.price));
  if (ev.platform) metaParts.push(ev.platform);
  if (titleEl) titleEl.textContent = ev.title || "Untitled";
  if (metaEl) metaEl.innerHTML = metaParts.map(function (p) { return "<span>" + escapeHtml(p) + "</span>"; }).join("");
  if (descEl) descEl.textContent = ev.description || "";
  if (descEl) descEl.style.display = (ev.description && ev.description.trim()) ? "block" : "none";
  var imgWrap = get("eventDetailImageWrap");
  if (imgEl) {
    if (ev.image_url && ev.image_url.indexOf("http") === 0) {
      imgEl.src = ev.image_url;
      imgEl.style.display = "block";
      imgEl.alt = ev.title || "Event";
      if (imgWrap) imgWrap.style.display = "block";
    } else {
      imgEl.style.display = "none";
      if (imgWrap) imgWrap.style.display = "none";
    }
  }
  if (linkEl) {
    linkEl.href = ev.link || "#";
    linkEl.style.display = (ev.link && ev.link.indexOf("http") === 0) ? "inline-block" : "none";
  }
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", eventModalKeydown);
}
function eventModalKeydown(e) {
  if (e.key === "Escape") closeEventModal();
}
function closeEventModal() {
  var overlay = get("eventDetailModal");
  if (overlay) {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }
  document.body.style.overflow = "";
  document.removeEventListener("keydown", eventModalKeydown);
}

function toggleNavDropdown(id) {
  var el = get(id);
  if (!el) return;
  var isOpen = el.classList.toggle("is-open");
  var btn = el.querySelector("button");
  if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  if (isOpen) document.addEventListener("click", closeNavDropdownOnClick);
}
function closeNavDropdown(id) {
  var el = get(id);
  if (el) el.classList.remove("is-open");
  el?.querySelector("button")?.setAttribute("aria-expanded", "false");
  document.removeEventListener("click", closeNavDropdownOnClick);
}
function closeNavDropdownOnClick(ev) {
  if (ev.target.closest(".nav-dropdown")) return;
  document.querySelectorAll(".nav-dropdown.is-open").forEach(function (d) {
    d.classList.remove("is-open");
    d.querySelector("button")?.setAttribute("aria-expanded", "false");
  });
  document.removeEventListener("click", closeNavDropdownOnClick);
}

async function deletePastEvents() {
  var url = eventsApiUrl();
  if (!url) {
    setStatus("Set EVENTS_API_URL to delete past events.");
    return;
  }
  setStatus("Deleting past events…");
  try {
    var res = await fetch(url + "?past=1", { method: "DELETE", headers: { "Content-Type": "application/json" } });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      setStatus("Delete failed: " + (data.error || res.status));
      return;
    }
    var n = (data.deleted != null) ? data.deleted : 0;
    setStatus("Deleted " + n + " past event(s). Refreshing…");
    await fetchEvents();
    populateFilterDropdowns();
    applyEventFilters();
    setStatus(eventsData.length + " event(s). Deleted " + n + " past.");
  } catch (err) {
    setStatus("Error: " + (err.message || "Could not delete past events."));
    console.error(err);
  }
}

async function loadEvents() {
  setStatus("Loading…");
  await fetchEvents();
  populateFilterDropdowns();
  applyEventFilters();
}

function showModal(id) {
  var el = get(id);
  if (el) {
    el.style.display = "flex";
    el.classList.remove("hidden");
    el.classList.add("flex");
    el.setAttribute("aria-hidden", "false");
  }
}

function hideModal(id) {
  var el = get(id);
  if (el) {
    el.style.display = "none";
    el.classList.add("hidden");
    el.classList.remove("flex");
    el.setAttribute("aria-hidden", "true");
  }
}

async function triggerPullFromDice() {
  var base = eventsApiUrl();
  if (!base) {
    setStatus("Set EVENTS_API_URL to enable pull.");
    return;
  }
  var scrapeUrl = (EVENTS_API_URL || "").replace(/\/$/, "") + "/api/scrape";
  setStatus("Pulling from Dice & Eventbrite…");
  try {
    var res = await fetch(scrapeUrl, { method: "POST", headers: { "Content-Type": "application/json" } });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      setStatus("Pull failed: " + (data.error || res.status));
      return;
    }
    var msg = "Pulled " + (data.inserted || 0) + " new";
    if (data.deleted != null && data.deleted > 0) msg += ", deleted " + data.deleted + " past";
    msg += ". Refreshing…";
    setStatus(msg);
    await fetchEvents();
    populateFilterDropdowns();
    applyEventFilters();
    msg = eventsData.length + " event(s)";
    if (data.inserted) msg += ". Inserted " + data.inserted;
    if (data.deleted) msg += ", deleted " + data.deleted + " past";
    setStatus(msg);
  } catch (err) {
    setStatus("Pull failed: " + (err.message || "Network error"));
    console.error(err);
  }
}

function closePullFromDiceModal() {
  hideModal("pull-dice-modal");
}

function openAddEventModal(prefill) {
  var form = document.getElementById("addEventForm");
  if (form) form.reset();
  if (prefill) {
    if (prefill.link) form.link.value = prefill.link;
    if (prefill.platform) form.platform.value = prefill.platform;
  }
  var successEl = get("add-event-success");
  if (successEl) successEl.classList.add("hidden");
  showModal("add-event-modal");
}

function closeAddEventModal() {
  hideModal("add-event-modal");
}

function openAddByUrlModal() {
  document.getElementById("addByUrlForm").reset();
  showModal("add-by-url-modal");
}

function closeAddByUrlModal() {
  hideModal("add-by-url-modal");
}

function handleAddByUrlSubmit(ev) {
  ev.preventDefault();
  var form = ev.target;
  var url = (form.url && form.url.value) || (get("add-by-url-input") && get("add-by-url-input").value);
  var platform = (form.platform && form.platform.value) || (get("add-by-url-platform") && get("add-by-url-platform").value) || "Dice";
  closeAddByUrlModal();
  openAddEventModal({ link: url, platform: platform });
  return false;
}

function handleAddEventSubmit(ev) {
  ev.preventDefault();
  var form = ev.target;
  var payload = {
    title: form.title.value.trim(),
    date: form.date.value,
    time: (form.time && form.time.value) || null,
    neighborhood: (form.neighborhood && form.neighborhood.value.trim()) || null,
    venue: (form.venue && form.venue.value.trim()) || null,
    address: (form.address && form.address.value.trim()) || null,
    price: (form.price && form.price.value.trim()) || null,
    link: form.link.value.trim(),
    platform: (form.platform && form.platform.value) || "Manual",
    description: (form.description && form.description.value.trim()) || null
  };
  if (demoMode) {
    payload.id = "demo-" + Date.now();
    payload.created_at = new Date().toISOString();
    eventsData.push(payload);
    populateFilterDropdowns();
    applyEventFilters();
    get("add-event-success").classList.remove("hidden");
    setStatus("Demo mode – event added locally.");
    return false;
  }
  fetch(eventsApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function (res) {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.status + " " + res.statusText);
  }).then(function (rows) {
    var row = Array.isArray(rows) ? rows[0] : rows;
    if (row) eventsData.push(row);
    populateFilterDropdowns();
    applyEventFilters();
    get("add-event-success").classList.remove("hidden");
    setStatus("Event added.");
  }).catch(function (err) {
    setStatus("Error: " + (err.message || "Could not add event."));
    console.error(err);
  });
  return false;
}

var deleteEventId = null;

function openDeleteEventModal(id, title) {
  deleteEventId = id;
  var el = get("delete-event-title");
  if (el) el.textContent = (title || "this event");
  var btn = get("confirm-delete-event-btn");
  if (btn) {
    btn.onclick = function () { confirmDeleteEvent(); };
  }
  showModal("delete-event-modal");
}

function closeDeleteEventModal() {
  hideModal("delete-event-modal");
  deleteEventId = null;
}

function confirmDeleteEvent() {
  if (!deleteEventId) {
    closeDeleteEventModal();
    return;
  }
  if (demoMode) {
    eventsData = eventsData.filter(function (e) { return e.id !== deleteEventId; });
    populateFilterDropdowns();
    applyEventFilters();
    setStatus("Demo mode – event removed.");
    closeDeleteEventModal();
    return;
  }
  fetch(eventsApiUrl() + "?id=" + encodeURIComponent(deleteEventId), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" }
  }).then(function (res) {
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    eventsData = eventsData.filter(function (e) { return e.id !== deleteEventId; });
    populateFilterDropdowns();
    applyEventFilters();
    setStatus("Event deleted.");
  }).catch(function (err) {
    setStatus("Error: " + (err.message || "Could not delete."));
    console.error(err);
  });
  closeDeleteEventModal();
}

document.addEventListener("DOMContentLoaded", function () {
  loadEvents();
  var searchEl = get("filterSearch");
  if (searchEl) searchEl.addEventListener("input", function () { applyEventFilters(); });
});
