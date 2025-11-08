(async () => {
  const base = 'http://localhost:5000';
  try {
    console.log('\n--- SUPERADMIN LOGIN ---');
    let r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'superadmin', password: 'superadmin123' }),
    });
    console.log('status', r.status);
    console.log(await r.text());
  } catch (e) {
    console.error('superadmin login error', e.message || e);
  }

  try {
    console.log('\n--- HEMA LOGIN ---');
    let r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hema', password: 'hema123' }),
    });
    console.log('status', r.status);
    console.log(await r.text());
  } catch (e) {
    console.error('hema login error', e.message || e);
  }

  const hemaId = '6902b16fcdc3ecd18ce6327e';
  try {
    console.log('\n--- LIST MATCHES CREATED BY HEMA ---');
    let r = await fetch(`${base}/api/matches?createdBy=${hemaId}`);
    console.log('status', r.status);
    const ms = await r.json();
    console.log('matches count', Array.isArray(ms) ? ms.length : 0);
    if (Array.isArray(ms) && ms.length > 0) {
      const id = ms[0]._id || ms[0].id || ms[0].matchId;
      console.log('first match id', id);

      console.log('\n--- FETCH MATCH (with hema header) ---');
      let r2 = await fetch(`${base}/api/matches/${id}`, {
        headers: { 'user-id': hemaId },
      });
      console.log('status', r2.status);
      console.log(await r2.text());
    }
  } catch (e) {
    console.error('list matches error', e.message || e);
  }

  try {
    console.log('\n--- CREATE PLAYER AS HEMA ---');
    let r = await fetch(`${base}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-id': hemaId },
      body: JSON.stringify({ name: 'AutoTestPlayer_E2E', jersey: 99 }),
    });
    console.log('status', r.status);
    console.log(await r.text());
  } catch (e) {
    console.error('create player error', e.message || e);
  }

  console.log('\n--- E2E CHECKS COMPLETE ---');
  process.exit(0);
})();
