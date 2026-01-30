async function getVTKey() {
  const { vtApiKey } = await chrome.storage.sync.get({ vtApiKey: "" });
  return vtApiKey;
}

async function vtCheckUrl(url) {
  const apiKey = await getVTKey();
  if (!apiKey) throw new Error("Missing VirusTotal API key. Set it in Options.");

  const form = new URLSearchParams();
  form.set("url", url);

  const submitResp = await fetch("https://www.virustotal.com/api/v3/urls", {
    method: "POST",
    headers: {
      "x-apikey": apiKey,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  if (!submitResp.ok) {
    const t = await submitResp.text();
    throw new Error(`VT submit failed (${submitResp.status}): ${t.slice(0, 200)}`);
  }

  const submitJson = await submitResp.json();
  const analysisId = submitJson?.data?.id;
  if (!analysisId) throw new Error("VT returned no analysis id");

  const analysisResp = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
    headers: { "x-apikey": apiKey }
  });

  if (!analysisResp.ok) {
    const t = await analysisResp.text();
    throw new Error(`VT analysis fetch failed (${analysisResp.status}): ${t.slice(0, 200)}`);
  }

  const analysisJson = await analysisResp.json();
  const stats = analysisJson?.data?.attributes?.stats || {};

  return {
    malicious: stats.malicious ?? 0,
    suspicious: stats.suspicious ?? 0,
    harmless: stats.harmless ?? 0,
    undetected: stats.undetected ?? 0,
    resultLink: `https://www.virustotal.com/gui/analysis/${analysisId}`
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "PMD_VT_CHECK_URL") {
    (async () => {
      try {
        const summary = await vtCheckUrl(msg.url);
        sendResponse({ ok: true, summary });
      } catch (e) {
        sendResponse({ ok: false, error: String(e.message || e) });
      }
    })();
    return true;
  }
});

// Context Menu - Check URL with VirusTotal
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pmd-check-url",
    title: "Check URL with VirusTotal",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "pmd-check-selection",
    title: "🔍 Check selected text with VirusTotal",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let urlToCheck = null;

  if (info.menuItemId === "pmd-check-url" && info.linkUrl) {
    urlToCheck = info.linkUrl;
  } else if (info.menuItemId === "pmd-check-selection" && info.selectionText) {
    // Try to extract URL from selection
    const text = info.selectionText.trim();
    if (text.match(/^https?:\/\//i)) {
      urlToCheck = text;
    } else {
      // Maybe it's a domain without protocol
      urlToCheck = "https://" + text;
    }
  }

  if (!urlToCheck) return;

  // Open popup window with result page
  const popupUrl = chrome.runtime.getURL("result/vt-result.html") + "?url=" + encodeURIComponent(urlToCheck);

  chrome.windows.create({
    url: popupUrl,
    type: "popup",
    width: 420,
    height: 500,
    focused: true
  });
});
