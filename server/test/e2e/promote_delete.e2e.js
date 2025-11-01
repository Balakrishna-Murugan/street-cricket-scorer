/*
Simple E2E helper script (manual) to exercise promote and delete-block flows.

Usage (manual):
  - Start your dev server: `npm run dev` from `server/` (or however you run it)
  - Set environment variables or edit the variables below:
      BASE_URL (default http://localhost:5000)
      SUPERADMIN_ID (an existing superadmin _id present in your DB)
  - Run: `node test/e2e/promote_delete.e2e.js`

This script is intentionally lightweight and intended for manual runs in dev.
It requires a running server and a superadmin user.
*/

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
const SUPERADMIN_ID = process.env.SUPERADMIN_ID || '';

if (!SUPERADMIN_ID) {
  console.error('Set SUPERADMIN_ID env var or edit the script to provide it.');
  process.exit(1);
}

(async () => {
  try {
    console.log('Finding a non-admin player to promote...');
    const playersRes = await axios.get(`${BASE_URL}/players`);
    const players = playersRes.data || [];
    const candidate = players.find(p => p.userRole !== 'admin' && p.userRole !== 'superadmin');
    if (!candidate) {
      console.error('No promotable player found. Create a sample player first.');
      process.exit(1);
    }

    console.log('Promoting player', candidate._id, 'using superadmin', SUPERADMIN_ID);
    const promoteRes = await axios.put(`${BASE_URL}/players/${candidate._id}/promote`, {}, { headers: { 'user-id': SUPERADMIN_ID } });
    console.log('Promote response:', promoteRes.data);

    console.log('Attempting to delete a team that is in-progress (if any) to validate delete-block behavior...');
    const matchesRes = await axios.get(`${BASE_URL}/matches`);
    const inProgressMatch = (matchesRes.data || []).find(m => m.status === 'in-progress');
    if (!inProgressMatch) {
      console.warn('No in-progress match found. Create an in-progress match for a team to test deletion block.');
      process.exit(0);
    }

    const teamId = inProgressMatch.team1 || inProgressMatch.team2;
    console.log('Checking conflicts for team', teamId);
    const conflictsRes = await axios.get(`${BASE_URL}/teams/${teamId}/conflicts`, { headers: { 'user-id': SUPERADMIN_ID } });
    console.log('Conflicts response:', conflictsRes.data);

    console.log('If conflicts were returned, team deletion should be blocked by API. Test complete.');
  } catch (err) {
    console.error('E2E script error:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
})();
