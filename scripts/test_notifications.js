// Test script: create a responder user, assign to station, report an active fire, then poll notifications
// Usage (powershell):
// $env:ADMIN_TOKEN = "..."; node scripts/test_notifications.js

let fetch;
if (globalThis && typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch.bind(globalThis);
} else {
  try {
    fetch = require('node-fetch');
  } catch (err) {
    console.error('No fetch implementation available. Run on Node 18+ or install node-fetch in the backend folder: npm install node-fetch');
    process.exit(1);
  }
}

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('Set ADMIN_TOKEN env var (admin JWT)');
  process.exit(1);
}

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

(async function(){
  try {
    // 1) Create a responder user
    const username = 'responder_test_' + Date.now();
    const password = 'Test1234!';
    console.log('Creating responder user', username);
    let res = await fetch(API_BASE + '/api/auth/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ username, password, email: `${username}@example.com`, role: 'responder' })
    });
    let data = await res.json();
    console.log('create-user status', res.status, data);
    if (!res.ok) {
      console.error('Failed to create user'); process.exit(1);
    }
    const userId = data.user && data.user.id;

    // 2) Fetch stations
    res = await fetch(API_BASE + '/api/firestation/admin', { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
    data = await res.json();
    const stations = data.rows || [];
    if (!stations.length) {
      console.error('No stations available; cannot proceed'); process.exit(1);
    }
    const station = stations[0];
    console.log('Using station', station.id, station.name);

    // 3) Create the responder already assigned to the station (avoid PATCH inconsistencies)
    // NOTE: some deployments may not allow patching station_id via /api/users; create with station_id directly
    console.log('Re-creating responder assigned to station');
    const username2 = username + '_s';
    res = await fetch(API_BASE + '/api/auth/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ username: username2, password, email: `${username2}@example.com`, role: 'responder', station_id: station.id })
    });
    data = await res.json();
    console.log('create-user (with station) status', res.status, data);
    if (!res.ok) { console.error('Failed to create assigned responder'); process.exit(1); }
    const userId2 = data.user && data.user.id;

    // 4) Login as the assigned responder (username2) to get token for polling
    res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username2, password })
    });
    data = await res.json();
    console.log('login status', res.status, data);
    if (!res.ok) { console.error('Responder login failed'); process.exit(1); }
    const RESP_TOKEN = data.token;

    // 5) Report an active fire near the station (use station coords if present)
    const lat = station.latitude || station.lat || 14.584; // fallback lat/lng
    const lng = station.longitude || station.lng || 121.032;
    console.log('Reporting active fire at', lat, lng);
    res = await fetch(API_BASE + '/api/active_fires', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESP_TOKEN}` },
      body: JSON.stringify({ lat, lng, address: 'Test address', barangay: 'Test Barangay', alarm_level: '1', reported_by: username2 })
    });
    data = await res.json();
    console.log('report status', res.status, data);
    if (!res.ok) { console.error('Failed to report active fire'); process.exit(1); }

    // 6) Poll /api/notifications for a few seconds to find the new notification
    const POLL_MS = 2500;
    const ATTEMPTS = 8;
    let found = false;
    for (let i=0;i<ATTEMPTS;i++){
      console.log('Polling notifications attempt', i+1);
      res = await fetch(API_BASE + '/api/notifications', { headers: { Authorization: `Bearer ${RESP_TOKEN}` } });
      let text = null;
      try {
        data = await res.json();
      } catch (err) {
        text = await res.text().catch(()=>null);
        console.error('Failed to parse JSON from /api/notifications. status=', res.status, 'text=', text);
        break;
      }
      if (!res.ok) { console.error('Failed to fetch notifications', data); break; }
      const rows = data.rows || [];
      console.log('Notifications count', rows.length);
      if (rows.some(n => n.payload && n.payload.fire_id)) { found = true; console.log('Found notification!', rows.find(n=>n.payload && n.payload.fire_id)); break; }
      await wait(POLL_MS);
    }

    if (!found) {
      console.error('Notification not found after polling'); process.exit(2);
    }

    console.log('Test completed successfully');
  } catch (err) {
    console.error('Test script error', err);
    process.exit(1);
  }
})();
