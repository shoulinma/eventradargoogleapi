const cheerio = require('cheerio');

const REQUEST_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_CONTACT_PAGES = 3;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function isAllowedWebsite(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanEmail(value) {
  const match = String(value || '').replace(/^mailto:/i, '').match(EMAIL_PATTERN);
  return match ? match[0].toLowerCase() : null;
}

function findLogo($, baseUrl, structuredData) {
  const structuredLogo = structuredData
    .map((entry) => entry?.logo)
    .find(Boolean);
  const logoValue = typeof structuredLogo === 'string' ? structuredLogo : structuredLogo?.url;
  const candidate = logoValue
    || $('meta[property="og:logo"]').attr('content')
    || $('link[rel~="icon"]').first().attr('href')
    || $('link[rel="apple-touch-icon"]').first().attr('href');

  if (!candidate) return null;
  try {
    return new URL(candidate, baseUrl).href;
  } catch {
    return null;
  }
}

function readStructuredData($) {
  const entries = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text());
      const values = Array.isArray(parsed) ? parsed : [parsed];
      entries.push(...values.flatMap((value) => value?.['@graph'] || value));
    } catch {
      // Ignore malformed third-party metadata.
    }
  });
  return entries.filter((entry) => entry && typeof entry === 'object');
}

function extractWebsiteMetadata(html, websiteUrl) {
  const $ = cheerio.load(html);
  const structuredData = readStructuredData($);
  const mailto = $('a[href^="mailto:"]').map((_, element) => $(element).attr('href')).get();
  const visibleText = $('body').text();
  const email = mailto.map(cleanEmail).find(Boolean) || cleanEmail(visibleText);

  return {
    email: email || null,
    logoUrl: findLogo($, websiteUrl, structuredData)
  };
}

function findContactPageUrls(html, websiteUrl) {
  const $ = cheerio.load(html);
  const baseUrl = new URL(websiteUrl);
  const urls = $('a[href]')
    .map((_, element) => {
      const text = `${$(element).text()} ${$(element).attr('href')}`.toLowerCase();
      if (!/(contact|about|team|staff|imprint|support)/.test(text)) return null;
      try {
        const url = new URL($(element).attr('href'), baseUrl);
        return url.origin === baseUrl.origin ? url.href : null;
      } catch {
        return null;
      }
    })
    .get();
  return [...new Set(urls)].slice(0, MAX_CONTACT_PAGES);
}

async function scrapeWebsiteMetadata(websiteUrl, fetchImpl = fetch, visitedUrls = new Set(), isHomepage = true) {
  if (!isAllowedWebsite(websiteUrl)) return { email: null, logoUrl: null };
  if (visitedUrls.has(websiteUrl)) return { email: null, logoUrl: null };
  visitedUrls.add(websiteUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(websiteUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal
    });
    if (!response.ok) return { email: null, logoUrl: null };

    const html = await response.text();
    if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
      return { email: null, logoUrl: null };
    }
    const metadata = extractWebsiteMetadata(html, websiteUrl);
    if (metadata.email) return metadata;

    if (!isHomepage) return metadata;
    const contactUrls = findContactPageUrls(html, websiteUrl);
    for (const contactUrl of contactUrls) {
      const contactMetadata = await scrapeWebsiteMetadata(contactUrl, fetchImpl, visitedUrls, false);
      if (contactMetadata.email) {
        return { email: contactMetadata.email, logoUrl: metadata.logoUrl || contactMetadata.logoUrl };
      }
    }
    return metadata;
  } catch {
    return { email: null, logoUrl: null };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { extractWebsiteMetadata, findContactPageUrls, scrapeWebsiteMetadata };
