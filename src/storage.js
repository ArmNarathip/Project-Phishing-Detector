const DEFAULT_SETTINGS = {
  allowDomains: ["yourcompany.com", "gmail.com", "outlook.com"],
  suspiciousKeywords: [
    "verify your account",
    "urgent",
    "password",
    "click here",
    "confirm",
    "suspended",
    "payment",
    "invoice",
    "reset"
  ],
  dangerousKeywords: [
    "seed phrase",
    "wallet",
    "wire transfer",
    "bank login",
    "immediately"
  ],
  unknownDomainSuspicious: true
};

async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...data };
}

async function setSettings(patch) {
  await chrome.storage.sync.set(patch);
}
