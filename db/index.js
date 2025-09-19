// Backwards-compatibility shim: re-export the canonical DB helper from config/db.js
// This file used to create its own Pool; the project now centralizes the pool in
// `config/db.js`. Keeping this shim avoids breaking imports that still reference
// `./db/index.js` while ensuring a single pool is used.

module.exports = require('../config/db');
