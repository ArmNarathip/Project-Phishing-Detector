const statusBadge = document.getElementById("statusBadge");
const statusIcon = document.getElementById("statusIcon");
const statusText = document.getElementById("statusText");
const urlBox = document.getElementById("urlBox");
const maliciousCount = document.getElementById("maliciousCount");
const suspiciousCount = document.getElementById("suspiciousCount");
const harmlessCount = document.getElementById("harmlessCount");
const undetectedCount = document.getElementById("undetectedCount");
const viewReport = document.getElementById("viewReport");
const closeBtn = document.getElementById("closeBtn");
const errorBox = document.getElementById("errorBox");

// Get URL from query params
const params = new URLSearchParams(window.location.search);
const urlToCheck = params.get("url");

document.body.classList.add("loading");

if (!urlToCheck) {
    showError("No URL provided");
} else {
    urlBox.textContent = urlToCheck;
    checkUrl(urlToCheck);
}

async function checkUrl(url) {
    chrome.runtime.sendMessage({ type: "PMD_VT_CHECK_URL", url }, (res) => {
        document.body.classList.remove("loading");

        if (!res?.ok) {
            showError(res?.error || "Unknown error");
            return;
        }

        const { malicious, suspicious, harmless, undetected, resultLink } = res.summary;

        // Update stats
        maliciousCount.textContent = malicious;
        suspiciousCount.textContent = suspicious;
        harmlessCount.textContent = harmless;
        undetectedCount.textContent = undetected;

        // Update status
        if (malicious > 0) {
            statusBadge.className = "status-badge malicious";
            statusIcon.textContent = "🚨";
            statusText.textContent = "Malicious";
        } else if (suspicious > 0) {
            statusBadge.className = "status-badge suspicious";
            statusIcon.textContent = "⚠️";
            statusText.textContent = "Suspicious";
        } else {
            statusBadge.className = "status-badge safe";
            statusIcon.textContent = "✅";
            statusText.textContent = "Safe";
        }

        // Update report link - ใช้ VirusTotal URL search พร้อม URL ที่ check
        const vtSearchUrl = "https://www.virustotal.com/gui/url/" + btoa(url).replace(/=/g, '');
        viewReport.href = vtSearchUrl;
        viewReport.classList.remove("hidden");
    });
}

function showError(message) {
    statusIcon.textContent = "❌";
    statusText.textContent = "Error";
    statusBadge.className = "status-badge malicious";
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
    viewReport.classList.add("hidden");
}

closeBtn.addEventListener("click", () => {
    window.close();
});
