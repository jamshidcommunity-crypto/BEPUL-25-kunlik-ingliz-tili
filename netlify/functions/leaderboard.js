// GET /.netlify/functions/leaderboard?code=B25-XXXXX → { ok, top:[{name,points,lessons,streak,me}], me:{rank,points}, total }
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
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, top, me, total: all.length }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false }) };
  }
};
