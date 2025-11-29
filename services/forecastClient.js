const fetch = require('node-fetch');
const { baseUrl } = require('../config/forecastService');

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
    const res = await fetch(`${baseUrl}/forecast`, {
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
