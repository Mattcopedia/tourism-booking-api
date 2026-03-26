const User = require('../models/userModel');

const cleanupUnconfirmedUsers = async () => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const result = await User.deleteMany({
    emailConfirmed: false,
    createdAt: { $lt: cutoff }
  });

  console.log(`🧹 Cleanup: Deleted ${result.deletedCount} unconfirmed users`);
};

module.exports = cleanupUnconfirmedUsers;
