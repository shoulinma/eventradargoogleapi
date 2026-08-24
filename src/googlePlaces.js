const METERS_PER_MILE = 1609.344;
const MAX_RADIUS_METERS = 50000;
const MAX_RESULTS = 20;

class GoogleApiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'GoogleApiError';
    this.status = status;
  }
}

function validateSearchInput(address, radiusMiles = 5) {
  const normalizedAddress = typeof address === 'string' ? address.trim() : '';
  const parsedRadius = Number(radiusMiles);

  if (!normalizedAddress) {
    throw new GoogleApiError('Please enter an address.', 400);
  }

  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
    throw new GoogleApiError('Radius must be a positive number.', 400);
  }

  const radiusMeters = parsedRadius * METERS_PER_MILE;
  if (radiusMeters > MAX_RADIUS_METERS) {
    throw new GoogleApiError('Radius cannot exceed 31 miles.', 400);
  }

  return { address: normalizedAddress, radiusMiles: parsedRadius, radiusMeters };
}

async function parseGoogleResponse(response, fallbackMessage) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error?.message || fallbackMessage;
    throw new GoogleApiError(message, response.status >= 400 && response.status < 500 ? 400 : 502);
  }
  return body;
}

async function geocodeAddress(address, apiKey, fetchImpl = fetch) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const response = await fetchImpl(url);
  const body = await parseGoogleResponse(response, 'Unable to geocode this address.');

  if (body.status !== 'OK' || !body.results?.length) {
    const messages = {
      ZERO_RESULTS: 'No location was found for that address.',
      REQUEST_DENIED: 'Google denied the geocoding request. Check the API key and enabled APIs.',
      OVER_QUERY_LIMIT: 'The Google API quota has been exceeded.'
    };
    throw new GoogleApiError(messages[body.status] || body.error_message || 'Unable to geocode this address.', 400);
  }

  const result = body.results[0];
  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    formattedAddress: result.formatted_address
  };
}

async function searchNearbyBusinesses(location, radiusMeters, apiKey, fetchImpl = fetch) {
  const response = await fetchImpl('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'places.types',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.businessStatus',
        'places.rating',
        'places.userRatingCount',
        'places.regularOpeningHours',
        'places.location'
      ].join(',')
    },
    body: JSON.stringify({
      maxResultCount: MAX_RESULTS,
      rankPreference: 'POPULARITY',
      locationRestriction: {
        circle: {
          center: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          radius: radiusMeters
        }
      }
    })
  });

  const body = await parseGoogleResponse(response, 'Unable to search for nearby businesses.');
  return (body.places || []).map((place) => ({
    id: place.id,
    name: place.displayName?.text || 'Unnamed business',
    businessType: place.primaryTypeDisplayName?.text || formatType(place.primaryType),
    industryTypes: (place.types || []).map(formatType),
    address: place.formattedAddress || null,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    internationalPhone: place.internationalPhoneNumber || null,
    website: place.websiteUri || null,
    googleMapsUrl: place.googleMapsUri || null,
    businessStatus: place.businessStatus || null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? 0,
    hours: place.regularOpeningHours?.weekdayDescriptions || [],
    location: place.location || null,
    email: null
  }));
}

function formatType(value) {
  if (!value) return 'Business';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function findBusinesses({ address, radiusMiles, apiKey, fetchImpl = fetch }) {
  const input = validateSearchInput(address, radiusMiles);
  const center = await geocodeAddress(input.address, apiKey, fetchImpl);
  const businesses = await searchNearbyBusinesses(center, input.radiusMeters, apiKey, fetchImpl);

  return {
    center,
    radiusMiles: input.radiusMiles,
    resultLimit: MAX_RESULTS,
    businesses
  };
}

module.exports = {
  GoogleApiError,
  findBusinesses,
  formatType,
  geocodeAddress,
  searchNearbyBusinesses,
  validateSearchInput
};
