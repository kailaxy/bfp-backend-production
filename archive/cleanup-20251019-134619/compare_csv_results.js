/**
 * Compare forecasts generated from CSV with Colab results
 */

const fs = require('fs');
const path = require('path');

function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i] ? values[i].trim() : '';
        });
        return obj;
    });
}

function normalizeBarangayName(name) {
    return name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/\s+/g, ' ')
        .trim();
}

function compareResults() {
    console.log('='.repeat(70));
    console.log('COMPARING: CSV-Generated Forecasts vs Colab Results');
    console.log('='.repeat(70));
    
    // Load both files
    const csvGenerated = parseCSV('forecasts_from_csv.csv');
    const colabResults = parseCSV('../Forecast_Results_Oct2025_to_Dec2026 (1).csv');
    
    console.log(`\n[*] Loaded ${csvGenerated.length} CSV-generated forecasts`);
    console.log(`[*] Loaded ${colabResults.length} Colab forecasts`);
    
    // Filter for October 2025 only
    const csvOct2025 = csvGenerated.filter(row => 
        parseInt(row.year) === 2025 && parseInt(row.month) === 10
    );
    
    // Colab CSV uses DATE column with format "2025-10-01 00:00:00"
    const colabOct2025 = colabResults.filter(row => {
        const date = row.DATE || '';
        return date.startsWith('2025-10');
    });
    
    console.log(`\n[*] October 2025: ${csvOct2025.length} CSV vs ${colabOct2025.length} Colab forecasts`);
    
    // Create lookup map for Colab results
    const colabMap = {};
    colabOct2025.forEach(row => {
        const normalized = normalizeBarangayName(row.Barangay || '');
        colabMap[normalized] = {
            predicted: parseFloat(row.Forecast) || 0,
            lower: parseFloat(row.Lower_CI) || 0,
            upper: parseFloat(row.Upper_CI) || 0,
            original: row.Barangay
        };
    });
    
    // Compare each CSV result
    console.log('\n' + '='.repeat(70));
    console.log('DETAILED COMPARISON - October 2025');
    console.log('='.repeat(70));
    console.log('Format: Barangay | CSV Generated | Colab | Difference | Status');
    console.log('-'.repeat(70));
    
    let matches = 0;
    let mismatches = 0;
    let missing = 0;
    const tolerance = 0.1; // 10% tolerance
    
    const comparisons = [];
    
    csvOct2025.forEach(csvRow => {
        const barangayName = csvRow.barangay;
        const normalized = normalizeBarangayName(barangayName);
        const csvPredicted = parseFloat(csvRow.predicted_cases) || 0;
        
        const colabData = colabMap[normalized];
        
        if (!colabData) {
            console.log(`[MISSING] ${barangayName}: CSV=${csvPredicted.toFixed(3)} | No Colab data`);
            missing++;
            comparisons.push({
                barangay: barangayName,
                csv: csvPredicted,
                colab: null,
                diff: null,
                status: 'MISSING'
            });
            return;
        }
        
        const colabPredicted = colabData.predicted;
        const diff = Math.abs(csvPredicted - colabPredicted);
        const percentDiff = colabPredicted !== 0 ? (diff / colabPredicted) * 100 : 0;
        const isMatch = percentDiff <= (tolerance * 100);
        
        if (isMatch) {
            matches++;
            console.log(`[MATCH] ${barangayName}: CSV=${csvPredicted.toFixed(3)} | Colab=${colabPredicted.toFixed(3)} | Diff=${diff.toFixed(3)} (${percentDiff.toFixed(1)}%)`);
        } else {
            mismatches++;
            console.log(`[MISMATCH] ${barangayName}: CSV=${csvPredicted.toFixed(3)} | Colab=${colabPredicted.toFixed(3)} | Diff=${diff.toFixed(3)} (${percentDiff.toFixed(1)}%)`);
        }
        
        comparisons.push({
            barangay: barangayName,
            csv: csvPredicted,
            colab: colabPredicted,
            diff: diff,
            percentDiff: percentDiff,
            status: isMatch ? 'MATCH' : 'MISMATCH'
        });
    });
    
    // Summary statistics
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Barangays Compared: ${csvOct2025.length}`);
    console.log(`[MATCH] Within ${tolerance * 100}% tolerance: ${matches}/${csvOct2025.length} (${((matches/csvOct2025.length)*100).toFixed(1)}%)`);
    console.log(`[MISMATCH] Outside tolerance: ${mismatches}/${csvOct2025.length} (${((mismatches/csvOct2025.length)*100).toFixed(1)}%)`);
    console.log(`[MISSING] No Colab data: ${missing}/${csvOct2025.length}`);
    
    // Show top matches
    const sortedByAccuracy = comparisons
        .filter(c => c.status === 'MATCH' || c.status === 'MISMATCH')
        .sort((a, b) => a.diff - b.diff);
    
    console.log('\n' + '='.repeat(70));
    console.log('TOP 10 BEST MATCHES (Smallest Absolute Difference)');
    console.log('='.repeat(70));
    sortedByAccuracy.slice(0, 10).forEach((c, i) => {
        console.log(`${i+1}. ${c.barangay}: CSV=${c.csv.toFixed(3)} vs Colab=${c.colab.toFixed(3)} (Diff: ${c.diff.toFixed(3)}, ${c.percentDiff.toFixed(1)}%)`);
    });
    
    // Show worst matches
    console.log('\n' + '='.repeat(70));
    console.log('TOP 10 WORST MATCHES (Largest Absolute Difference)');
    console.log('='.repeat(70));
    sortedByAccuracy.slice(-10).reverse().forEach((c, i) => {
        console.log(`${i+1}. ${c.barangay}: CSV=${c.csv.toFixed(3)} vs Colab=${c.colab.toFixed(3)} (Diff: ${c.diff.toFixed(3)}, ${c.percentDiff.toFixed(1)}%)`);
    });
    
    // Check specific important barangays
    console.log('\n' + '='.repeat(70));
    console.log('KEY BARANGAYS CHECK');
    console.log('='.repeat(70));
    const keyBarangays = ['Addition Hills', 'Plainview', 'Highway Hills', 'Hulo', 'Wack-wack Greenhills'];
    keyBarangays.forEach(name => {
        const comp = comparisons.find(c => c.barangay === name);
        if (comp) {
            console.log(`${name}:`);
            console.log(`  CSV Generated: ${comp.csv.toFixed(3)}`);
            console.log(`  Colab Result:  ${comp.colab !== null ? comp.colab.toFixed(3) : 'N/A'}`);
            console.log(`  Difference:    ${comp.diff !== null ? comp.diff.toFixed(3) + ' (' + comp.percentDiff.toFixed(1) + '%)' : 'N/A'}`);
            console.log(`  Status:        ${comp.status}`);
            console.log('');
        }
    });
    
    console.log('='.repeat(70));
    console.log('[DONE] Comparison complete!');
    console.log('='.repeat(70));
}

compareResults();
