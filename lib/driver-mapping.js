// Mapping of driver usernames to their Spoke driver IDs and pay rates
// Username should match the keys in PIN_STORE_JSON (lowercase, no spaces)
const DRIVER_CONFIG = {
  "samuel": {
    spokeId: "drivers/C3FHHQMfuA0IsT4s5vMS",
    payRate: 14, // £/hour
    displayName: "Samuel Wood"
  },
  "andrew": {
    spokeId: "drivers/qbpuf9YKNITFPeWP394N",
    payRate: 15,
    displayName: "Andrew Etherton"
  },
  "dwayne": {
    spokeId: "drivers/BGGAScfhbYMloTlHcN2I",
    payRate: 14,
    displayName: "Dwayne Wood"
  },
  "papa": {
    spokeId: "drivers/owAnlpsVVGiozSvBVbx9",
    payRate: 14,
    displayName: "Papa"
  },
  "phillip": {
    spokeId: "drivers/btJz2WEttKnj43XY2jWO",
    payRate: 14,
    displayName: "Phillip"
  },
  "steve": {
    spokeId: "drivers/tyRiKKu5jQ75CMYigPXb",
    payRate: 14,
    displayName: "Steve"
  },
  "bradley": {
    spokeId: "drivers/QKd8NDExVzC7Bm4FHjlr",
    payRate: 15,
    displayName: "Bradley"
  }
};

// Admin users (no Spoke driver ID, used for viewing all drivers)
const ADMIN_USERS = ["admin"];

// Get Spoke driver ID from username
function getDriverId(username) {
  if (!username) return null;
  const normalizedUsername = username.toLowerCase().trim();
  const config = DRIVER_CONFIG[normalizedUsername];
  return config ? config.spokeId : null;
}

// Get display name from username
function getDisplayName(username) {
  if (!username) return '';
  const normalizedUsername = username.toLowerCase().trim();
  const config = DRIVER_CONFIG[normalizedUsername];
  return config ? config.displayName : username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
}

// Get pay rate for a driver
function getPayRate(username) {
  if (!username) return parseFloat(process.env.PAY_RATE || '14');
  const normalizedUsername = username.toLowerCase().trim();
  const config = DRIVER_CONFIG[normalizedUsername];
  return config ? config.payRate : parseFloat(process.env.PAY_RATE || '14');
}

// Check if user is admin
function isAdmin(username) {
  if (!username) return false;
  const normalizedUsername = username.toLowerCase().trim();
  return ADMIN_USERS.includes(normalizedUsername);
}

// Get all driver usernames
function getAllDriverUsernames() {
  return Object.keys(DRIVER_CONFIG);
}

// Get driver config
function getDriverConfig(username) {
  if (!username) return null;
  const normalizedUsername = username.toLowerCase().trim();
  return DRIVER_CONFIG[normalizedUsername] || null;
}

module.exports = {
  DRIVER_CONFIG,
  ADMIN_USERS,
  getDriverId,
  getDisplayName,
  getPayRate,
  isAdmin,
  getAllDriverUsernames,
  getDriverConfig
};
