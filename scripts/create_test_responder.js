const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

(async ()=>{
  try {
    const s = await db.query('SELECT id,name FROM mandaluyong_fire_stations LIMIT 1');
    if (!s.rows.length) { console.error('NO_STATION'); process.exit(0); }
    const station = s.rows[0];
    const username = 'testresponder' + Date.now();
    const pw = 'Password1!';
    const hash = await bcrypt.hash(pw, 10);
    const email = username + '@example.com';
    const ins = await db.query('INSERT INTO users (username,password_hash,email,role,station_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,username,station_id', [username, hash, email, 'responder', station.id]);
    const u = ins.rows[0];
    const token = jwt.sign({ id: u.id, username: u.username, role: 'responder' }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1d' });
    console.log('STATION', JSON.stringify(station));
    console.log('USER', JSON.stringify(u));
    console.log('TOKEN', token);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
