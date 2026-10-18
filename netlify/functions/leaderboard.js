// GET /.netlify/functions/leaderboard?code=B25-XXXXX → { ok, top:[{name,points,lessons,streak,me}], me:{rank,points}, total, team:[{name,points,lessons,me,role}] }
// team = the student, the friend who invited him (ref), the friends he invited (inv) and the other people his referrer invited (sib).
const { col } = require('./lib/db');
const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json', 'cache-control': 'no-store' };
const shortName = (n) => { const p = String(n || 'Oʻquvchi').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0]; };

exports.handler = async (event) => {
  const code = String((event.queryStringParameters || {}).code || '').trim().toUpperCase();
  try {
    let myUid = null;
    if (code) {
      if (process.env.MASTER_CODE && code === process.env.MASTER_CODE.toUpperCase()) myUid = 'master';
      else { const c = await col('b25_codes').doc(code).get(); if (c.exists) myUid = String(c.data().uid); }
    }
    const snap = await col('b25_progress').get();
    const all = snap.docs.map(d => d.data()).filter(x => x.uid !== 'master' && (x.points || 0) > 0)
      .sort((a, b) => (b.points || 0) - (a.points || 0) || (b.lessons || 0) - (a.lessons || 0));
    const top = all.slice(0, 20).map(x => ({ name: shortName(x.name), points: x.points || 0, lessons: x.lessons || 0, streak: x.streak || 0, me: x.uid === myUid }));
    const idx = all.findIndex(x => x.uid === myUid);
    const me = idx >= 0 ? { rank: idx + 1, points: all[idx].points || 0 } : null;
    let team = [];
    if (myUid && myUid !== 'master') {
      const byUid = {}; snap.docs.forEach(d => { const x = d.data(); byUid[String(x.uid)] = x; });
      const me0 = (await col('b25_users').doc(myUid).get()).data() || {};
      const roles = { [myUid]: 'me' };
      if (me0.ref) { roles[String(me0.ref)] = 'ref'; (await col('b25_users').where('ref', '==', String(me0.ref)).get()).docs.forEach(d => { if (d.id !== myUid) roles[d.id] = 'sib'; }); }
      (await col('b25_users').where('ref', '==', myUid).get()).docs.forEach(d => { roles[d.id] = 'inv'; });
      const names = {}; for (const id of Object.keys(roles)) if (!byUid[id]) { const u = (await col('b25_users').doc(id).get()).data(); if (u) names[id] = u.name; }
      team = Object.entries(roles).map(([id, role]) => { const p = byUid[id] || {}; return { name: shortName(p.name || names[id]), points: p.points || 0, lessons: p.lessons || 0, streak: p.streak || 0, me: id === myUid, role }; })
        .sort((a, b) => b.points - a.points || b.lessons - a.lessons).slice(0, 8);
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, top, me, total: all.length, team }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false }) };
  }
};
