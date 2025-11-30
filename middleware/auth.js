const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    
    // Ensure this is an access token, not a refresh token
    if (user.type && user.type !== 'access') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    
    req.user = user;
    next();
  });
}

module.exports = authenticateJWT;
