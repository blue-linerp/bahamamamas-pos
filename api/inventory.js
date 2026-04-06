const { createKvHandler } = require('../lib/apiKvHandler');

module.exports = createKvHandler('inventory', {
  getDefault: () => ({}),
  validatePut: (b) => b !== null && typeof b === 'object' && !Array.isArray(b),
});
