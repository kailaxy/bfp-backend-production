function isIntegerLike(v) {
  if (v === null || v === undefined || v === '') return false;
  return Number.isInteger(Number(v));
}

function isFloatLike(v) {
  if (v === null || v === undefined || v === '') return false;
  return !Number.isNaN(Number(v));
}

module.exports = { isIntegerLike, isFloatLike };
