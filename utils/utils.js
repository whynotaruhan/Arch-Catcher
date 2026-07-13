require('colors');

/**
 * Splits an array into chunks of `size`.
 * @param {Array}  array
 * @param {number} size
 * @returns {Array[]}
 */
function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Formats a number with commas.
 * @param {number|string} number
 * @returns {string}
 */
function commatize(number) {
  const str = String(number ?? 0);
  let out   = '';
  for (let i = str.length - 1, n = 0; i >= 0; i--, n++) {
    out = str[i] + out;
    if (n % 3 === 2 && i !== 0) out = ',' + out;
  }
  return out;
}

/**
 * Pretty console log with timestamp.
 * @param {string} message
 */
function log(message) {
  const ts = new Date().toISOString().slice(11, -5).cyan;
  console.log(`[${ts}] ${message}`);
}

module.exports = { chunk, commatize, log };
