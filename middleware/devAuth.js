// Inject a development user into requests when running in non-production
// If an Authorization header is present, do nothing.
const jwt = require('jsonwebtoken');

module.exports = function devAuth(req, res, next) {
  if (process.env.NODE_ENV === 'production') return next();
  if (req.headers.authorization) return next();

  // Option 1: if DEV_AUTH_TOKEN is set, verify and attach its payload
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  if (process.env.DEV_AUTH_TOKEN) {
    try {
      const payload = jwt.verify(process.env.DEV_AUTH_TOKEN, JWT_SECRET);
      req.user = payload;
      return next();
    } catch (err) {
      // ignore and fallthrough
    }
  }

  // Option 2: if DEV_USER env var is set (as JSON string) use that
  if (process.env.DEV_USER) {
    try {
      req.user = JSON.parse(process.env.DEV_USER);
      return next();
    } catch (err) {
      // ignore and continue
    }
  }

  // No-op if no dev auth configured
  return next();
};
