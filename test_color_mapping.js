// Test the color mapping logic
const getRiskColor = (riskLevel) => {
  const level = riskLevel?.toLowerCase() || '';
  
  // High risk (red) - for "High" risk levels
  if (level.includes('high')) return '#e74c3c';
  
  // Medium/Moderate risk (orange) - for "Medium", "Moderate", "Low-Moderate"
  if (level.includes('medium') || level.includes('moderate')) return '#e67e22';
  
  // Low risk (yellow) - for "Low" but not "Very Low" or "Low-Moderate"
  if (level.includes('low') && !level.includes('very') && !level.includes('moderate')) return '#f1c40f';
  
  // Very Low/Minimal risk (green) - for "Very Low" or "Minimal"
  if (level.includes('very low') || level.includes('minimal')) return '#2ecc71';
  
  return '#95a5a6';  // Gray for unknown
};

console.log('🎨 Testing color mapping:\n');

const testCases = [
  { level: 'High', expected: 'Red (#e74c3c)' },
  { level: 'Medium', expected: 'Orange (#e67e22)' },
  { level: 'Moderate', expected: 'Orange (#e67e22)' },
  { level: 'Low-Moderate', expected: 'Orange (#e67e22)' },
  { level: 'Low', expected: 'Yellow (#f1c40f)' },
  { level: 'Very Low', expected: 'Green (#2ecc71)' },
  { level: 'Minimal', expected: 'Green (#2ecc71)' },
  { level: null, expected: 'Gray (#95a5a6)' },
  { level: 'Unknown', expected: 'Gray (#95a5a6)' }
];

testCases.forEach(test => {
  const color = getRiskColor(test.level);
  const status = color === test.expected.match(/#[a-f0-9]{6}/i)?.[0] ? '✅' : '❌';
  console.log(`${status} "${test.level || 'null'}" → ${color} (expected ${test.expected})`);
});

console.log('\n📊 Real data from database:\n');
console.log(`  Addition Hills: "Medium" → ${getRiskColor('Medium')} (should be orange for 0.97 fires)`);
console.log(`  Namayan: "Very Low" → ${getRiskColor('Very Low')} (should be green for 0.04 fires)`);
console.log(`  Hulo: "Low-Moderate" → ${getRiskColor('Low-Moderate')} (should be orange for 0.39 fires)`);
