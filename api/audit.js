const { createKvHandler } = require('../lib/apiKvHandler');

module.exports = createKvHandler('audit', {
  getDefault: () => [],
  validatePut: (b) => Array.isArray(b),
});
