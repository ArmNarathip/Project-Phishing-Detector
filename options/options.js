const vtApiKey = document.getElementById("vtApiKey");
const allowDomains = document.getElementById("allowDomains");
const susKw = document.getElementById("susKw");
const danKw = document.getElementById("danKw");

const saveKey = document.getElementById("saveKey");
const saveAllow = document.getElementById("saveAllow");
const saveSus = document.getElementById("saveSus");
const saveDan = document.getElementById("saveDan");

function linesToList(s) {
  return s.split("\n").map(x => x.trim()).filter(Boolean);
}
function listToLines(arr) {
  return (arr || []).join("\n");
}

(async function init() {
  const settings = await getSettings();
  allowDomains.value = listToLines(settings.allowDomains);
  susKw.value = listToLines(settings.suspiciousKeywords);
  danKw.value = listToLines(settings.dangerousKeywords);

  const keyData = await chrome.storage.sync.get({ vtApiKey: "" });
  vtApiKey.value = keyData.vtApiKey || "";
})();

saveKey.addEventListener("click", async () => {
  await chrome.storage.sync.set({ vtApiKey: vtApiKey.value.trim() });
  alert("Saved VirusTotal API key");
});

saveAllow.addEventListener("click", async () => {
  await setSettings({ allowDomains: linesToList(allowDomains.value) });
  alert("Saved allow domains");
});

saveSus.addEventListener("click", async () => {
  await setSettings({ suspiciousKeywords: linesToList(susKw.value) });
  alert("Saved suspicious keywords");
});

saveDan.addEventListener("click", async () => {
  await setSettings({ dangerousKeywords: linesToList(danKw.value) });
  alert("Saved dangerous keywords");
});
