const test = require('node:test');
const assert = require('node:assert/strict');
const { extractWebsiteMetadata, scrapeWebsiteMetadata } = require('../src/websiteMetadata');

test('extracts an email and logo from public website metadata', () => {
  const html = `
    <html><head>
      <script type="application/ld+json">
        {"@type":"LocalBusiness","logo":"/assets/logo.svg"}
      </script>
    </head><body><a href="mailto:HELLO@Example.com">Contact</a></body></html>`;

  assert.deepEqual(extractWebsiteMetadata(html, 'https://example.com/about'), {
    email: 'hello@example.com',
    logoUrl: 'https://example.com/assets/logo.svg'
  });
});

test('returns empty metadata when a website is unavailable', async () => {
  const result = await scrapeWebsiteMetadata('https://example.com', async () => {
    throw new Error('network failure');
  });

  assert.deepEqual(result, { email: null, logoUrl: null });
});

test('checks a same-domain contact page when the homepage has no email', async () => {
  const pages = new Map([
    ['https://example.com', '<a href="/contact">Contact</a>'],
    ['https://example.com/contact', '<p>Write to contact@example.com</p>']
  ]);
  const result = await scrapeWebsiteMetadata('https://example.com', async (url) => ({
    ok: true,
    text: async () => pages.get(String(url))
  }));

  assert.equal(result.email, 'contact@example.com');
});
