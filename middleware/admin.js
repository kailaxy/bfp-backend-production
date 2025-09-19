const express = require('express');

function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'No user in request' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = requireAdmin;
