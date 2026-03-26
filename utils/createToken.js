const crypto = require('crypto');

const createToken = function() {
  const token = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const expires = Date.now() + 10 * 60 * 1000;

  return {
    token,
    hashedToken,
    expires
  };
};

module.exports = createToken;
