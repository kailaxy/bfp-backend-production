// POST an active fire at station 6 coordinates and then check notifications for station 6
const jwt = require('jsonwebtoken');
const fetch = globalThis.fetch || require('node-fetch');
const pool = require('../config/db');

(async ()=>{
  try{
    const token = jwt.sign({id:1,username:'devadmin',role:'admin'}, process.env.JWT_SECRET || 'supersecret', {expiresIn:'1d'});
    const lat = 14.5771704;
    const lng = 121.0333542;
    console.log('Posting active fire at', lat, lng);
    const res = await fetch('http://localhost:5000/api/active_fires', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lat, lng, address: 'Test near station 6', barangay: 'Test', alarm_level: '1', reported_by: 'devadmin' })
    });
    const data = await res.json().catch(()=>null);
    console.log('POST status', res.status, data);

    // small wait for async notifications to be inserted
    await new Promise(r=>setTimeout(r,500));

    // query notifications for station 6 users
    const users = await pool.query('SELECT id, username FROM users WHERE station_id = $1', [6]);
    console.log('users at station 6:', users.rows);
    const ids = users.rows.map(u=>u.id);
    if(ids.length){
      const notifs = await pool.query('SELECT id,user_id,message,payload,read,created_at FROM notifications WHERE user_id = ANY($1::int[]) ORDER BY created_at DESC', [ids]);
      console.log('notifications for station 6 users:', notifs.rows);
    } else {
      console.log('no users assigned to station 6');
    }
  }catch(e){
    console.error('err', e && e.message ? e.message : e);
  }finally{ process.exit(0); }
})();
