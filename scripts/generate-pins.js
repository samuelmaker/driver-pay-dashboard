#!/usr/bin/env node

/**
 * Generate random 6-digit PINs for drivers
 * Usage: node scripts/generate-pins.js driver1 driver2 driver3
 * Output: JSON suitable for PIN_STORE_JSON environment variable
 */

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/generate-pins.js <driver1> <driver2> ...');
  console.error('Example: node scripts/generate-pins.js samuel dwayne alice');
  process.exit(1);
}

const pins = {};
args.forEach(driverName => {
  pins[driverName.toLowerCase()] = generatePin();
});

console.log('\n=== Generated PINs ===\n');
console.log('Copy this JSON to your PIN_STORE_JSON environment variable:\n');
console.log(JSON.stringify(pins, null, 2));
console.log('\n=== Individual PINs (share with drivers) ===\n');
Object.entries(pins).forEach(([name, pin]) => {
  console.log(`${name}: ${pin}`);
});
console.log('\n');
