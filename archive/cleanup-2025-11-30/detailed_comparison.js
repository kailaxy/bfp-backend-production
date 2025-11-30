const fs = require('fs').promises;
const path = require('path');

async function compareData() {
  console.log('📊 Comparing Colab CSV vs Database CSV\n');
  
  // Read both files
  const colabPath = path.join(__dirname, '..', 'datatoforecasts.csv');
  const dbPath = path.join(__dirname, '..', 'database_historical_data.csv');
  
  const colabContent = await fs.readFile(colabPath, 'utf8');
  const dbContent = await fs.readFile(dbPath, 'utf8');
  
  // Parse Colab CSV
  const colabLines = colabContent.split('\n').slice(1); // Skip header
  const colabData = {};
  colabLines.forEach(line => {
    if (!line.trim()) return;
    const [barangay, date, count] = line.split(',');
    const key = `${barangay.trim()}_${date.trim()}`;
    colabData[key] = parseInt(count);
  });
  
  // Parse Database CSV (more complex format)
  const dbLines = dbContent.split('\n').slice(1); // Skip header  
  const dbData = {};
  dbLines.forEach(line => {
    if (!line.trim()) return;
    // Format: barangay_name,Tue Oct 01 2024 00:00:00 GMT+0800 (Taiwan Standard Time),1
    const match = line.match(/^([^,]+),\w+ (\w+) \d+ (\d+)[^,]+,(\d+)$/);
    if (match) {
      const barangay = match[1].trim();
      const month = match[2];
      const year = match[3];
      const count = parseInt(match[4]);
      
      // Convert month name to number
      const monthMap = {Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                       Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'};
      const monthNum = monthMap[month];
      const dateStr = `${year}-${monthNum}`;
      
      const key = `${barangay}_${dateStr}`;
      dbData[key] = count;
    }
  });
  
  console.log(`Colab records: ${Object.keys(colabData).length}`);
  console.log(`Database records: ${Object.keys(dbData).length}`);
  
  // Find most recent dates for Addition Hills
  const additionHillsColab = Object.keys(colabData)
    .filter(k => k.startsWith('Addition Hills'))
    .sort()
    .slice(-10);
  
  const additionHillsDb = Object.keys(dbData)
    .filter(k => k.startsWith('Addition Hills'))
    .sort()
    .slice(-10);
  
  console.log('\n📅 Last 10 Addition Hills records in Colab:');
  additionHillsColab.forEach(key => {
    const date = key.split('_')[1];
    console.log(`   ${date}: ${colabData[key]} incidents`);
  });
  
  console.log('\n📅 Last 10 Addition Hills records in Database:');
  additionHillsDb.forEach(key => {
    const date = key.split('_')[1];
    console.log(`   ${date}: ${dbData[key]} incidents`);
  });
  
  // Check for differences
  console.log('\n🔍 Checking for differences in Addition Hills data:');
  const allKeys = new Set([...additionHillsColab, ...additionHillsDb]);
  let differences = 0;
  
  allKeys.forEach(key => {
    const colabVal = colabData[key] || 0;
    const dbVal = dbData[key] || 0;
    if (colabVal !== dbVal) {
      const date = key.split('_')[1];
      console.log(`   ${date}: Colab=${colabVal}, DB=${dbVal}`);
      differences++;
    }
  });
  
  if (differences === 0) {
    console.log('   ✅ All Addition Hills data matches!');
  } else {
    console.log(`   ❌ Found ${differences} differences`);
  }
}

compareData().catch(console.error);
