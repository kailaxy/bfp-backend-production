// Middleware to require a user be a responder or admin
module.exports = function requireResponder(req, res, next) {
  // Expecting req.user to be set by auth middleware (devAuth or actual auth)
  const user = req.user || {};
  if (!user.role) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (user.role === 'admin' || user.role === 'responder') {
    return next();
  }
  return res.status(403).json({ error: 'Responder role required' });
};
