const { getForecast } = require('../services/forecastClient');

(async () => {
  try {
    const resp = await getForecast([10, 11, 13, 15, 14, 16], { method: 'moving_average', horizon: 5, moving_average_window: 3 });
    console.log('Forecast response:', resp);
    process.exit(0);
  } catch (err) {
    console.error('Error calling forecast microservice:', err.message);
    process.exit(1);
  }
})();
