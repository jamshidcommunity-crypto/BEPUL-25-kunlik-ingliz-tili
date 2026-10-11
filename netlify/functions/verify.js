// GET /.netlify/functions/verify?code=B25-XXXXX → { ok, name, username, uid, openDay }
// Checks an access code issued by the bot. MASTER_CODE (env) always works (teacher / testing).
const { col } = require('./lib/db');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  const code = String((event.queryStringParameters || {}).code || '').trim().toUpperCase();
  if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'no code' }) };
  try {
    const cfg = await col('b25_config').doc('main').get();
    const openDay = cfg.exists && cfg.data().openDay ? cfg.data().openDay : null;
    if (process.env.MASTER_CODE && code === process.env.MASTER_CODE.toUpperCase()) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, uid: 'master', name: 'Oʻqituvchi', username: '', openDay: 25, master: true }) };
    }
    const c = await col('b25_codes').doc(code).get();
    if (!c.exists) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'invalid' }) };
    const u = await col('b25_users').doc(String(c.data().uid)).get();
    const d = u.exists ? u.data() : {};
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, uid: String(c.data().uid), name: d.name || '', username: d.username || '', openDay }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'server' }) };
  }
};
