// Elements
const scanBtn = document.getElementById("scanBtn");
const statusText = document.getElementById("statusText");

const resultWrap = document.getElementById("resultWrap");
const levelBadge = document.getElementById("levelBadge");
const metaLine = document.getElementById("metaLine");
const reasonsEl = document.getElementById("reasons");

const urlInput = document.getElementById("urlInput");
const checkBtn = document.getElementById("checkBtn");
const vtOut = document.getElementById("vtOut");

// Settings UI
const gearBtn = document.getElementById("gearBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

const vtApiKey = document.getElementById("vtApiKey");
const allowDomains = document.getElementById("allowDomains");
const susKw = document.getElementById("susKw");
const danKw = document.getElementById("danKw");

const saveKey = document.getElementById("saveKey");
const saveAllow = document.getElementById("saveAllow");
const saveSus = document.getElementById("saveSus");
const saveDan = document.getElementById("saveDan");

// Dark Mode
const darkModeToggle = document.getElementById("darkModeToggle");

function setBadge(level) {
  levelBadge.textContent = level;
  if (level === "Normal") {
    levelBadge.style.background = "rgba(0, 255, 170, .12)";
    levelBadge.style.borderColor = "rgba(0,255,170,.35)";
  } else if (level === "Suspicious") {
    levelBadge.style.background = "rgba(255, 200, 0, .12)";
    levelBadge.style.borderColor = "rgba(255,200,0,.35)";
  } else {
    levelBadge.style.background = "rgba(255, 70, 70, .12)";
    levelBadge.style.borderColor = "rgba(255,70,70,.35)";
  }
}


function resetUI() {
  // start fresh every time popup opens
  statusText.textContent = "Ready to scan";
  resultWrap.classList.add("hidden");
  setBadge("—");
  metaLine.textContent = "—";
  reasonsEl.innerHTML = "";
  vtOut.textContent = "Result";
  urlInput.value = "";
  settingsPanel.classList.add("hidden");
}

function renderScan(res) {
  const { ctx, report } = res;
  resultWrap.classList.remove("hidden");

  setBadge(report.level);
  metaLine.textContent =
    `${ctx.source} • From: ${ctx.fromEmail || "?"} • Domain: ${report.senderDomain || "?"} • Score: ${report.points}`;

  reasonsEl.innerHTML = "";
  const list = report.reasons.length ? report.reasons : ["No obvious phishing signals found."];
  for (const r of list) {
    const li = document.createElement("li");
    li.textContent = r;
    reasonsEl.appendChild(li);
  }
}

function linesToList(s) {
  return s.split("\n").map(x => x.trim()).filter(Boolean);
}
function listToLines(arr) {
  return (arr || []).join("\n");
}

async function loadSettingsIntoUI() {
  const settings = await getSettings();
  allowDomains.value = listToLines(settings.allowDomains);
  susKw.value = listToLines(settings.suspiciousKeywords);
  danKw.value = listToLines(settings.dangerousKeywords);

  const keyData = await chrome.storage.sync.get({ vtApiKey: "" });
  vtApiKey.value = keyData.vtApiKey || "";
}

async function doScan() {
  scanBtn.disabled = true;
  statusText.textContent = "Scanning";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    statusText.textContent = "No active tab";
    scanBtn.disabled = false;
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "PMD_SCAN_EMAIL" }, (res) => {
    scanBtn.disabled = false;

    if (!res?.ok) {
      statusText.textContent = "Scan failed (open an email first)";
      return;
    }

    statusText.textContent = `Done: ${res.report.level}`;
    // keep lastScan only during this popup session; we clear it on close.
    chrome.storage.local.set({ lastScan: res });
    renderScan(res);
  });
}

async function doVTCheck() {
  const url = urlInput.value.trim();
  if (!url) return;

  vtOut.textContent = "Checking VirusTotal…";
  chrome.runtime.sendMessage({ type: "PMD_VT_CHECK_URL", url }, (res) => {
    if (!res?.ok) {
      vtOut.textContent = `Error: ${res?.error || "unknown"}`;
      return;
    }
    const { malicious, suspicious, harmless, undetected, resultLink } = res.summary;
    vtOut.innerHTML = `
      Malicious: <b>${malicious}</b> • Suspicious: <b>${suspicious}</b> • Harmless: <b>${harmless}</b> • Undetected: <b>${undetected}</b><br/>
      ${resultLink ? `Analysis: ${resultLink}` : ""}
    `;
  });
}

// Wiring
scanBtn.addEventListener("click", doScan);
checkBtn.addEventListener("click", doVTCheck);

// Settings toggle
gearBtn.addEventListener("click", async () => {
  await loadSettingsIntoUI();
  settingsPanel.classList.remove("hidden");

  document.body.classList.add("no-scroll");
});
closeSettingsBtn.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
  document.body.classList.remove("no-scroll");

});

// Toast notification
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Save settings
saveKey.addEventListener("click", async () => {
  await chrome.storage.sync.set({ vtApiKey: vtApiKey.value.trim() });
  showToast("API Key saved!");
});

saveAllow.addEventListener("click", async () => {
  await setSettings({ allowDomains: linesToList(allowDomains.value) });
  showToast("Domains saved!");
});

saveSus.addEventListener("click", async () => {
  await setSettings({ suspiciousKeywords: linesToList(susKw.value) });
  showToast("Saved Suspicious Keywords!");
});

saveDan.addEventListener("click", async () => {
  await setSettings({ dangerousKeywords: linesToList(danKw.value) });
  showToast("Saved Dangerous Keywords!");
});

// Dark Mode Toggle
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.remove("light-theme");
    darkModeToggle.checked = true;
  } else {
    document.body.classList.add("light-theme");
    darkModeToggle.checked = false;
  }
}

// Load theme on start
chrome.storage.sync.get({ darkMode: false }, (data) => {
  applyTheme(data.darkMode);
});

// Toggle theme
darkModeToggle.addEventListener("change", () => {
  const isDark = darkModeToggle.checked;
  applyTheme(isDark);
  chrome.storage.sync.set({ darkMode: isDark });
});

// Start fresh on open
resetUI();

// When popup closes: stop session + clear lastScan so next open starts new
window.addEventListener("unload", () => {
  try { chrome.storage.local.remove(["lastScan"]); } catch (_) { }
});


