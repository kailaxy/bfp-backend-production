// Create an admin user if not exists. Usage:
// ADMIN_USERNAME=admin ADMIN_PASSWORD=YourPass node scripts/create_admin.js

const { createUser, findByUsername } = require('../models/user');
const db = require('../db');

(async ()=>{
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'Admin1234!';
    const email = process.env.ADMIN_EMAIL || (username + '@example.com');

    // check if exists
    const existing = await findByUsername(username);
    if (existing) {
      // if user exists but is not admin, promote and optionally reset password
      if (existing.role !== 'admin' || process.env.FORCE_PASSWORD_RESET === '1') {
        const bcrypt = require('bcrypt');
        const SALT_ROUNDS = 10;
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        await db.query('UPDATE users SET role = $1, password_hash = $2 WHERE id = $3', ['admin', hash, existing.id]);
        console.log('Promoted existing user to admin and set password:', { id: existing.id, username: existing.username, email });
        console.log('Password:', password);
        process.exit(0);
      }
      console.log('Admin already exists:', { id: existing.id, username: existing.username, email: existing.email, role: existing.role });
      process.exit(0);
    }

    const user = await createUser({ username, password, email, role: 'admin' });
    console.log('Created admin:', { id: user.id, username: user.username, email: user.email, password });
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
