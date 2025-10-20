const fs = require('fs');
const path = require('path');

function fixMightbecorrectdata() {
  console.log('🔧 Fixing malformed data in mightbecorrectdata.csv...\n');
  
  const csvPath = path.join(__dirname, '..', 'mightbecorrectdata.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`📊 Total lines: ${lines.length}\n`);
  
  const fixedLines = [];
  let fixed = 0;
  let merged = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Fix leading spaces
    if (line.startsWith(' ')) {
      console.log(`Line ${i + 1}: Removing leading space`);
      line = line.trim();
      fixed++;
    }
    
    // Check if this line starts with a date pattern (MM/DD/YYYY)
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}/;
    const isValidLine = datePattern.test(line) || i === 0; // Allow header
    
    if (!isValidLine && line.trim()) {
      // This is a wrapped line - merge with previous
      console.log(`Line ${i + 1}: Merging wrapped line with previous`);
      console.log(`   Content: "${line}"`);
      
      if (fixedLines.length > 0) {
        // Remove the newline and merge
        const prevLine = fixedLines[fixedLines.length - 1];
        fixedLines[fixedLines.length - 1] = prevLine.trimEnd() + line;
        merged++;
        continue;
      }
    }
    
    fixedLines.push(line);
  }
  
  console.log(`\n✅ Fixed ${fixed} lines with leading spaces`);
  console.log(`✅ Merged ${merged} wrapped lines\n`);
  
  // Write fixed version
  const fixedPath = path.join(__dirname, '..', 'mightbecorrectdata_fixed.csv');
  fs.writeFileSync(fixedPath, fixedLines.join('\n'), 'utf-8');
  
  console.log(`💾 Saved fixed version to: mightbecorrectdata_fixed.csv`);
  console.log(`📊 Lines: ${lines.length} → ${fixedLines.length}\n`);
  
  // Verify no more malformed lines
  console.log('🔍 Verifying fixed data...\n');
  const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}/;
  let malformed = 0;
  
  for (let i = 1; i < fixedLines.length; i++) { // Skip header
    const line = fixedLines[i];
    if (!line.trim()) continue;
    
    if (!datePattern.test(line)) {
      console.log(`❌ Still malformed (line ${i + 1}): ${line.substring(0, 50)}`);
      malformed++;
    }
  }
  
  if (malformed === 0) {
    console.log('✅ All lines now have valid date format!\n');
  } else {
    console.log(`⚠️  Still ${malformed} malformed lines\n`);
  }
}

fixMightbecorrectdata();
