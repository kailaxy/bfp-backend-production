// services/geocode.js
require('dotenv').config();
const axios = require('axios');

async function reverseGeocode(lat, lng) {
  const res = await axios.get(
    'https://maps.googleapis.com/maps/api/geocode/json',
    {
      params: {
        latlng: `${lat},${lng}`,
        key: process.env.GOOGLE_API_KEY
      }
    }
  );

  const { status, results = [], error_message } = res.data;
  if (status !== 'OK') {
    console.error('[reverseGeocode] Google status:', status, error_message);
    throw new Error(`Google Maps error: ${status}`);
  }
  if (!results.length) {
    throw new Error('Google Maps error: ZERO_RESULTS');
  }

  // Try to pick a street-level address (skip plus-code)
  let formatted = null;
  const preferredTypes = new Set([
    'street_address',
    'premise',
    'subpremise',
    'route',
    'establishment'
  ]);

  for (const r of results) {
    if (r.types.some(t => preferredTypes.has(t))) {
      formatted = r.formatted_address;
      break;
    }
  }

  // Fallback to the first result
  if (!formatted) {
    formatted = results[0].formatted_address;
  }

  return formatted;  // a string
}

module.exports = { reverseGeocode };
