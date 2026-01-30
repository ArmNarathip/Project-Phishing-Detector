function isGmail() {
  return location.host.includes("mail.google.com");
}
function isOutlook() {
  return location.host.includes("outlook.office.com") || location.host.includes("outlook.live.com");
}

function extractFromGmail() {
  const fromEl = document.querySelector('span[email][name]') || document.querySelector('span[email]');
  const fromEmail = fromEl?.getAttribute("email") || "";

  const subjectEl = document.querySelector('h2.hP') || document.querySelector('h2[data-thread-perm-id]');
  const subject = subjectEl?.innerText || "";

  const bodyEl = document.querySelector('div.a3s.aiL') || document.querySelector('div.a3s');
  const bodyText = bodyEl?.innerText || "";

  return { fromEmail, subject, bodyText, source: "Gmail" };
}

function extractFromOutlook() {
  const fromEl =
    document.querySelector('span[role="button"][title*="@"]') ||
    document.querySelector('span[title*="@"]') ||
    document.querySelector('[data-testid="messageHeaderFrom"] span');

  const fromEmail = (fromEl?.getAttribute("title") || fromEl?.innerText || "")
    .match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";

  const subjectEl =
    document.querySelector('[data-testid="message-subject"]') ||
    document.querySelector('div[role="heading"]');

  const subject = subjectEl?.innerText || "";

  const bodyEl =
    document.querySelector('div[role="document"]') ||
    document.querySelector('[data-testid="messageBody"]');

  const bodyText = bodyEl?.innerText || "";

  return { fromEmail, subject, bodyText, source: "Outlook" };
}

function extractEmailContext() {
  try {
    if (isGmail()) return extractFromGmail();
    if (isOutlook()) return extractFromOutlook();

    const bodyText = document.body?.innerText?.slice(0, 20000) || "";
    return { fromEmail: "", subject: document.title || "", bodyText, source: "Generic" };
  } catch (e) {
    return { fromEmail: "", subject: "", bodyText: "", source: "Unknown", error: String(e) };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "PMD_SCAN_EMAIL") {
    (async () => {
      const settings = await getSettings();
      const ctx = extractEmailContext();
      const report = scoreEmail(ctx, settings);
      sendResponse({ ok: true, ctx, report });
    })();
    return true;
  }
});
