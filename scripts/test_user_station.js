// Simple test script to create a user via admin endpoint and update station_id
// Usage: set ADMIN_TOKEN=... & node scripts/test_user_station.js
const fetch = require('node-fetch');
(async () => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return console.error('Set ADMIN_TOKEN env var');
  try {
    // Create user
    let res = await fetch('http://localhost:5000/api/auth/admin/create-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: 'tester'+Date.now(), password: 'Test1234!', email: 't@example.com', role: 'responder' })
    });
    let data = await res.json();
    console.log('create-user:', res.status, data);
    const userId = data.user && data.user.id;
    if (!userId) return;

    // Fetch stations
    res = await fetch('http://localhost:5000/api/firestation/admin', { headers: { Authorization: `Bearer ${token}` } });
    data = await res.json();
    const stations = data.rows || [];
    console.log('stations:', stations.length);
    if (!stations.length) return console.error('No stations available to assign');

    const stationId = stations[0].id;

    // Patch user with station
    res = await fetch(`http://localhost:5000/api/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ station_id: stationId })
    });
    data = await res.json();
    console.log('patch:', res.status, data);
  } catch (err) {
    console.error(err);
  }
})();
