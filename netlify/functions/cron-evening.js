// Scheduled every day 19:00 Tashkent (14:00 UTC, see netlify.toml).
// 1) Students inactive for 2+ days get a gentle reminder (at most once per 2 days).
// 2) On Sundays everyone gets the weekly top-5.
const { col } = require('./lib/db');
const tg = require('./lib/tg');
const { broadcast } = require('./lib/broadcast');
const APP = process.env.APP_URL || '';
const DAY = 864e5;
const shortName = (n) => { const p = String(n || 'Oʻquvchi').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0]; };

async function run(nowMs = Date.now()) {
  const users = (await col('b25_users').get()).docs.map(x => x.data()).filter(u => u.code);
  const prog = {}; (await col('b25_progress').get()).docs.forEach(d => { prog[d.id] = d.data(); });
  const out = {};

  const lazy = users.filter(u => {
    const p = prog[String(u.id)] || {};
    const last = p.lastActive || (u.codeAt && u.codeAt.toMillis ? u.codeAt.toMillis() : 0);
    return last && nowMs - last > 2 * DAY && (!u.remindedAt || nowMs - u.remindedAt > 2 * DAY);
  });
  out.reminders = await broadcast(lazy, (u) => {
    const p = prog[String(u.id)] || {};
    const done = p.lessons || 0;
    return {
      text: `👋 ${tg.esc((u.name || '').split(' ')[0])}, sizni darsda koʻrmayapmiz!\n\n` +
        (done ? `Siz allaqachon <b>${done} ta dars</b> tugatgansiz — toʻxtab qolmang. ` : 'Kursni hali boshlamadingiz. ') +
        `Bugun atigi <b>10–15 daqiqa</b> ajrating: bitta dars yoki soʻz takrorlash.\n\nKichik qadamlar — katta natija 💪`,
      extra: tg.kb([[{ text: '📱 Davom etish', url: `${APP}/?code=${u.code}` }]]),
    };
  }, { deadlineMs: 12000 });
  for (const u of lazy) await col('b25_users').doc(String(u.id)).set({ remindedAt: nowMs }, { merge: true });

  const tashkent = new Date(nowMs + 5 * 3600e3);
  if (tashkent.getUTCDay() === 0) {
    const top = Object.values(prog).filter(p => p.uid !== 'master' && (p.points || 0) > 0).sort((a, b) => b.points - a.points).slice(0, 5);
    if (top.length) {
      const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
      const list = top.map((p, i) => `${medals[i]} ${tg.esc(shortName(p.name))} — <b>${p.points}</b> ball`).join('\n');
      out.weekly = await broadcast(users, (u) => ({
        text: `🏆 <b>Haftaning eng faol oʻquvchilari</b>\n\n${list}\n\nSiz ham roʻyxatga kiring — har bir dars, shadowing va soʻz takrorlash ball beradi!`,
        extra: tg.kb([[{ text: '🏆 Reytingni koʻrish', url: `${APP}/?code=${u.code}#reyting` }]]),
      }), { deadlineMs: 12000 });
    }
  }
  return out;
}
exports.handler = async () => { try { const r = await run(); console.log('evening', r); return { statusCode: 200, body: JSON.stringify(r) }; } catch (e) { console.error(e); return { statusCode: 500, body: 'err' }; } };
exports.run = run;
