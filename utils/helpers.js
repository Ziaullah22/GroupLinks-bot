function isAdmin(userId, adminId) {
  return userId.toString() === adminId.toString();
}

module.exports = {
  isAdmin
};