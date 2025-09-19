const similarity = require('string-similarity');
const masterList = require('../data/barangays.json');
const aliasMap = { BagongSilang: 'Bagong Silang' };

function matchBarangay(rawName) {
  if (aliasMap[rawName]) return aliasMap[rawName];
  const { bestMatch, bestMatchIndex } =
    similarity.findBestMatch(rawName, masterList);
  if (bestMatch.rating < 0.8) {
    throw new Error(`Ambiguous barangay: "${rawName}"`);
  }
  return masterList[bestMatchIndex];
}

module.exports = { matchBarangay };
