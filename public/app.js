const form = document.querySelector('#search-form');
const addressInput = document.querySelector('#address');
const resultsSection = document.querySelector('#results-section');
const resultsTitle = document.querySelector('#results-title');
const resultCount = document.querySelector('#result-count');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const submitButton = form.querySelector('button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoading(true);
  resultsSection.hidden = false;
  results.innerHTML = '';
  status.textContent = 'Searching Google Places...';
  status.className = 'status loading';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const response = await fetch('/api/businesses/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addressInput.value, radiusMiles: 5 })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'The search could not be completed.');

    renderResults(data);
  } catch (error) {
    status.textContent = error.message;
    status.className = 'status error';
    resultCount.textContent = '';
  } finally {
    setLoading(false);
  }
});

function renderResults(data) {
  const count = data.businesses.length;
  resultsTitle.textContent = data.center.formattedAddress;
  resultCount.textContent = `${count} ${count === 1 ? 'business' : 'businesses'} found`;

  if (!count) {
    status.textContent = 'No businesses were returned for this area. Try a more specific address.';
    status.className = 'status empty';
    return;
  }

  status.textContent = count === data.resultLimit
    ? `Showing Google's top ${data.resultLimit} results within ${data.radiusMiles} miles.`
    : `Showing results within ${data.radiusMiles} miles.`;
  status.className = 'status note';
  results.innerHTML = data.businesses.map(businessCard).join('');
}

function businessCard(business, index) {
  const rating = business.rating
    ? `<span class="rating" title="${business.reviewCount} Google reviews">★ ${business.rating} <small>(${business.reviewCount})</small></span>`
    : '<span class="muted">No rating</span>';
  const types = business.industryTypes.slice(0, 4)
    .map((type) => `<span class="type-chip">${escapeHtml(type)}</span>`)
    .join('');
  const hours = business.hours.length
    ? `<details><summary>Opening hours</summary><ul>${business.hours.map((day) => `<li>${escapeHtml(day)}</li>`).join('')}</ul></details>`
    : '';

  return `
    <article class="business-card" style="--delay: ${Math.min(index * 45, 450)}ms">
      <div class="card-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="card-main">
        <div class="card-title-row">
          <div>
            <p class="business-type">${escapeHtml(business.businessType)}</p>
            <h3>${escapeHtml(business.name)}</h3>
          </div>
          ${rating}
        </div>
        <div class="contact-list">
          ${infoRow('pin', business.address, business.googleMapsUrl)}
          ${infoRow('phone', business.phone, business.phone ? `tel:${business.phone}` : null)}
          ${infoRow('globe', business.website ? displayDomain(business.website) : null, business.website)}
          ${infoRow('mail', 'Email not provided by Google', null, true)}
        </div>
        <div class="types">${types}</div>
        ${hours}
      </div>
    </article>`;
}

function infoRow(icon, value, href, muted = false) {
  if (!value) return '';
  const icons = {
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92Z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
  };
  const content = href
    ? `<a href="${escapeAttribute(href)}" target="${href.startsWith('http') ? '_blank' : '_self'}" rel="noreferrer">${escapeHtml(value)}</a>`
    : `<span>${escapeHtml(value)}</span>`;
  return `<div class="contact-item${muted ? ' muted' : ''}"><svg aria-hidden="true" viewBox="0 0 24 24">${icons[icon]}</svg>${content}</div>`;
}

function displayDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.querySelector('span').textContent = loading ? 'Searching...' : 'Find businesses';
}
