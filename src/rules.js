function normalizeText(s = "") {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractDomain(email = "") {
  const m = email.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return m ? m[1].toLowerCase() : "";
}

function scoreEmail({ fromEmail, subject, bodyText }, settings) {
  const allowDomains = (settings.allowDomains || []).map(d => d.toLowerCase());
  const subj = normalizeText(subject);
  const body = normalizeText(bodyText);
  const from = (fromEmail || "").toLowerCase();
  const domain = extractDomain(from);

  let reasons = [];
  let points = 0;

  if (domain) {
    const isAllowed = allowDomains.includes(domain);
    if (!isAllowed && settings.unknownDomainSuspicious) {
      points += 30;
      reasons.push(`Sender domain not in allowlist: ${domain}`);
    }
  } else {
    points += 15;
    reasons.push("Cannot extract sender domain");
  }

  const suspicious = (settings.suspiciousKeywords || []).map(normalizeText);
  const dangerous = (settings.dangerousKeywords || []).map(normalizeText);

  for (const kw of suspicious) {
    if (!kw) continue;
    if (subj.includes(kw) || body.includes(kw)) {
      points += 10;
      reasons.push(`Suspicious keyword matched: "${kw}"`);
    }
  }

  for (const kw of dangerous) {
    if (!kw) continue;
    if (subj.includes(kw) || body.includes(kw)) {
      points += 25;
      reasons.push(`Dangerous keyword matched: "${kw}"`);
    }
  }

  const linkCount = (bodyText.match(/https?:\/\/\S+/gi) || []).length;
  if (linkCount >= 3) {
    points += 10;
    reasons.push(`Contains many links (${linkCount})`);
  }

  let level = "Normal";
  if (points >= 60) level = "Dangerous";
  else if (points >= 25) level = "Suspicious";

  return { level, points, reasons, senderDomain: domain };
}
