const pool = require('./db');

pool.query(`
  SELECT barangay_name, month, year, predicted_cases, risk_level
  FROM forecasts 
  WHERE barangay_name LIKE 'Hagdang%'
  ORDER BY barangay_name, year, month
  LIMIT 12
`).then(r => {
  console.log('Hagdang Bato forecasts:');
  r.rows.forEach(x => {
    console.log(`  ${x.barangay_name} - ${x.month}/${x.year}: ${x.predicted_cases} (${x.risk_level})`);
  });
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
