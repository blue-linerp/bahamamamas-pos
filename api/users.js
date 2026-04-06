const { createKvHandler } = require('../lib/apiKvHandler');
const { DEFAULT_USERS } = require('../lib/defaults');

module.exports = createKvHandler('users', {
  getDefault: () => JSON.parse(JSON.stringify(DEFAULT_USERS)),
  validatePut: (b) => Array.isArray(b),
});
