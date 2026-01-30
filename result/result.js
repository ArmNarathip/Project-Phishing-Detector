const levelBadge = document.getElementById("levelBadge");
const metaLine = document.getElementById("metaLine");
const reasonsEl = document.getElementById("reasons");
const rescanBtn = document.getElementById("rescanBtn");
const openOptions = document.getElementById("openOptions");

const urlInput = document.getElementById("urlInput");
const checkBtn = document.getElementById("checkBtn");
const vtOut = document.getElementById("vtOut");

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

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

function render(res) {
  const { ctx, report } = res;
  setBadge(report.level);
  metaLine.textContent = `${ctx.source} • From: ${ctx.fromEmail || "?"} • Domain: ${report.senderDomain || "?"} • Score: ${report.points}`;

  reasonsEl.innerHTML = "";
  (report.reasons.length ? report.reasons : ["No obvious phishing signals found."])
    .forEach(r => {
      const li = document.createElement("li");
      li.textContent = r;
      reasonsEl.appendChild(li);
    });
}

chrome.storage.local.get(["lastScan"], async ({ lastScan }) => {
  if (!lastScan?.ok) {
    setBadge("—");
    metaLine.textContent = "No scan data. Please scan from popup.";
    return;
  }
  render(lastScan);
});

rescanBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return alert("No active tab");

  chrome.tabs.sendMessage(tab.id, { type: "PMD_SCAN_EMAIL" }, (res) => {
    if (!res?.ok) return alert("Rescan failed. Open an email first.");
    chrome.storage.local.set({ lastScan: res }, () => render(res));
  });
});

// ===== VirusTotal URL Check =====
checkBtn.addEventListener("click", async () => {
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
});
