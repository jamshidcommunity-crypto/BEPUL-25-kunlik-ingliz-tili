// POST /.netlify/functions/progress  { code, name, units, shadow, test }  → saves the student's progress
// (keyed by the Telegram user id behind the code), so the bot's /holat and admin /natija can show it.
const { col, now } = require('./lib/db');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '{}' };
  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: CORS, body: '{}' }; }
  const code = String(b.code || '').trim().toUpperCase();
  if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false }) };
  try {
    let uid;
    if (process.env.MASTER_CODE && code === process.env.MASTER_CODE.toUpperCase()) uid = 'master';
    else { const c = await col('b25_codes').doc(code).get(); if (!c.exists) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'invalid' }) }; uid = String(c.data().uid); }
    const u = uid === 'master' ? null : (await col('b25_users').doc(uid).get()).data();
    const units = {}; for (const [k, v] of Object.entries(b.units || {})) if (/^\d+$/.test(k) && v && typeof v.score === 'number') units[k] = { score: Math.max(0, Math.min(18, v.score | 0)), at: v.at || 0 };
    const shadow = {}; for (const k of Object.keys(b.shadow || {})) if (/^\d+$/.test(k)) shadow[k] = true;
    const test = b.test && typeof b.test.score === 'number' ? { score: Math.max(0, Math.min(40, b.test.score | 0)), at: b.test.at || 0 } : null;
    await col('b25_progress').doc(uid).set({ uid, name: String(b.name || (u && u.name) || '').slice(0, 80), username: (u && u.username) || '', units, shadow, test, updatedAt: now() }, { merge: true });
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'server' }) };
  }
};
