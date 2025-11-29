const fetch = require('node-fetch');
const { baseUrl } = require('../config/forecastService');

function normalizeBaseUrl(url) {
  if (!url) return '';
  let u = String(url).trim();
  if (!/^https?:\/\//i.test(u)) {
    // Assume HTTPS if protocol missing (works for Cloud Run URLs)
    u = `https://${u}`;
  }
  // Remove trailing slashes
  u = u.replace(/\/+$/, '');
  return u;
}

async function getForecast(series, options = {}) {
  const body = {
    series,
    horizon: options.horizon ?? 7,
    method: options.method ?? 'naive',
    moving_average_window: options.moving_average_window ?? 3,
    arima_order: options.arima_order ?? null,
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);
  try {
    const origin = normalizeBaseUrl(baseUrl);
    const url = `${origin}/forecast`;
    // Validate absolute URL
    try { new URL(url); } catch (e) { throw new Error(`Invalid FORECAST_SERVICE_URL: ${baseUrl}`); }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Forecast error ${res.status}: ${detail}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getForecast };
