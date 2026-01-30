// Mapping of driver usernames to their Spoke driver IDs
// Username should match the keys in PIN_STORE_JSON (lowercase, no spaces)
const DRIVER_ID_MAP = {
  "samuel": "drivers/C3FHHQMfuA0IsT4s5vMS",
  "andrew": "drivers/qbpuf9YKNITFPeWP394N",
  "dwayne": "drivers/BGGAScfhbYMloTlHcN2I",
  "nial": "drivers/UwKdTMLtb9B3Olp2rfOc",
  "steven": "drivers/ajijcr2XxsyKEDIVLoTF",
  "papa": "drivers/owAnlpsVVGiozSvBVbx9",
  "kamil": "drivers/LYs6mPCbd2CBIdgzQlCw",
  "malcolm": "drivers/jSaX88Tw9wCLutcx20Yi",
  "phillip": "drivers/btJz2WEttKnj43XY2jWO",
  "saleem": "drivers/bA8SOYyoj2ZYnSUFvVQE",
  "kerry": "drivers/sKzSHeJzCKOBT8XSxlXn",
  "steve": "drivers/tyRiKKu5jQ75CMYigPXb",
  "bradley": "drivers/QKd8NDExVzC7Bm4FHjlr"
};

// Get Spoke driver ID from username
function getDriverId(username) {
  if (!username) return null;
  const normalizedUsername = username.toLowerCase().trim();
  return DRIVER_ID_MAP[normalizedUsername] || null;
}

// Get display name from username
function getDisplayName(username) {
  if (!username) return '';
  // Capitalize first letter
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
}

module.exports = {
  DRIVER_ID_MAP,
  getDriverId,
  getDisplayName
};
