var count = 0;

function normalizeWebsiteUrl(value) {
  var candidate = String(value || "").trim();
  if (!candidate) return null;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(candidate)) candidate = "https://" + candidate;
  try {
    var parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch (error) {
    return null;
  }
}

function show(ok, message, ms) {
  count++;
  document.getElementById("checks").textContent = count;
  document.getElementById("statusWord").textContent = ok ? "Online" : "Offline";
  document.getElementById("statusDetail").textContent = ok ? "All systems responding" : "Incident needs attention";
  document.getElementById("latency").textContent = ms ? ms + " ms" : "—";
  document.getElementById("monitorResult").textContent = message;
  document.querySelector(".lab-stat").style.background = ok ? "#d7ff45" : "#ff6b35";
}

document.getElementById("monitorForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  var input = document.getElementById("monitorUrl");
  var url = normalizeWebsiteUrl(input.value);
  if (!url) {
    document.getElementById("monitorResult").textContent = "ENTER A VALID WEBSITE\nTry something like www.google.com";
    input.focus();
    return;
  }
  var displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  input.value = displayUrl;
  var started = performance.now();
  document.getElementById("monitorResult").textContent = "Checking " + displayUrl + "…";
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store" });
    show(true, "ONLINE\n" + displayUrl + " responded to the browser health check.", Math.round(performance.now() - started));
  } catch (error) {
    show(false, "UNREACHABLE\nThe browser could not reach " + displayUrl + ".", Math.round(performance.now() - started));
  }
});

document.getElementById("simulateBtn").addEventListener("click", function () {
  show(false, "SIMULATED INCIDENT\nHTTP 503 · Service unavailable", 0);
});
