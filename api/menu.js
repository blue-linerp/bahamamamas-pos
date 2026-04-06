const { createKvHandler } = require('../lib/apiKvHandler');
const { DEFAULT_MENU } = require('../lib/defaults');

module.exports = createKvHandler('menu', {
  getDefault: () => JSON.parse(JSON.stringify(DEFAULT_MENU)),
  validatePut: (b) => Array.isArray(b),
});
