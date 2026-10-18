// POST /.netlify/functions/progress  { code, name, units, shadow, test, badges, streak, srsCorrect, seconds }
// Saves progress (keyed by the Telegram user id behind the code), computes points for the leaderboard,
// and congratulates the student in Telegram for each NEW badge and for passing the final test.
const { col, now } = require('./lib/db');
const tg = require('./lib/tg');
const { BADGES, points } = require('./lib/game');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json' };
const TEST_PASS = 28;

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
    const half = (x, max) => Math.max(0, Math.min(max, Math.round(Number(x) * 2) / 2));
    const units = {}; for (const [k, v] of Object.entries(b.units || {})) if (/^\d+$/.test(k) && v && typeof v.score === 'number') units[k] = { score: half(v.score, 18), at: v.at || 0 };
    const shadow = {}; for (const k of Object.keys(b.shadow || {})) if (/^\d+$/.test(k)) shadow[k] = true;
    const test = b.test && typeof b.test.score === 'number' ? { score: Math.max(0, Math.min(40, b.test.score | 0)), at: b.test.at || 0 } : null;
    const valid = new Set(BADGES.map(x => x.id));
    const badges = Array.isArray(b.badges) ? [...new Set(b.badges.filter(x => valid.has(x)))] : [];
    const doc = {
      uid, name: String(b.name || (u && u.name) || '').slice(0, 80), username: (u && u.username) || '',
      units, shadow, test, badges,
      streak: Math.max(0, Math.min(365, b.streak | 0)),
      srsCorrect: Math.max(0, Math.min(100000, b.srsCorrect | 0)),
      seconds: Math.max(0, Math.min(1e7, b.seconds | 0)),
      updatedAt: now(), lastActive: Date.now(),
    };
    doc.points = points(doc);
    doc.lessons = Object.keys(units).length; // a lesson counts once all 18 exercises are answered (any score)

    const prevSnap = await col('b25_progress').doc(uid).get();
    const prev = prevSnap.exists ? prevSnap.data() : {};
    await col('b25_progress').doc(uid).set(doc, { merge: true });

    if (uid !== 'master') {
      const had = new Set(prev.badges || []);
      const fresh = badges.filter(x => !had.has(x));
      for (const id of fresh.slice(0, 3)) {
        const bd = BADGES.find(x => x.id === id);
        await tg.send(uid, `${bd.icon} <b>Yangi nishon: ${tg.esc(bd.name)}</b>\n${tg.esc(bd.desc)}. Barakalla, davom eting! 💪`).catch(() => {});
      }
      const passedNow = test && test.score >= TEST_PASS && !(prev.test && prev.test.score >= TEST_PASS);
      if (passedNow) {
        await tg.send(uid,
          `🎓 <b>Tabriklaymiz!</b> Siz «Beginner 25» kursini muvaffaqiyatli tugatdingiz — yakuniy test: <b>${test.score}/40</b>.\n\n` +
          `Sertifikatingiz ilovada (Profil → Sertifikat) — yuklab olib, doʻstlaringizga ulashing.\n\n` +
          `🎓 Keyingi bosqich — <b>Imamov Academy Elementary</b>: bitiruvchilar uchun 1-dars bepul va maxsus shartlar. Pastdagi tugmani bosing — ustoz oʻzi bogʻlanadi.`,
          tg.kb([[{ text: '📝 Keyingi bosqichga yozilish', callback_data: 'next' }], [{ text: '✍️ Ustozga yozish', url: 'https://t.me/jamshid_akhatkulov' }]])
        ).catch(() => {});
      }
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, points: doc.points }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'server' }) };
  }
};
