// Scheduled every day 08:00 Tashkent (03:00 UTC, see netlify.toml).
// When the teacher opens a new day (/kun N in the bot), every student with a code gets a morning message once.
const { col, now } = require('./lib/db');
const tg = require('./lib/tg');
const { broadcast } = require('./lib/broadcast');
let DAYS = []; try { DAYS = require('./lib/days.json'); } catch (e) {}
const APP = process.env.APP_URL || '';

async function run() {
  const cfgRef = col('b25_config').doc('main');
  const cfg = (await cfgRef.get()).data() || {};
  const day = cfg.openDay || 1;
  if ((cfg.announcedDay || 0) >= day) return { skipped: true, day };
  const d = DAYS.find(x => x.day === day) || { title: '' };
  const users = (await col('b25_users').get()).docs.map(x => x.data()).filter(u => u.code);
  const r = await broadcast(users, (u) => ({
    text: `☀️ Xayrli tong, ${tg.esc((u.name || '').split(' ')[0])}!\n\n📘 <b>Day ${day}</b> ochildi: <b>${tg.esc(d.title)}</b>\n` +
      (d.units ? `Bugun: ${d.units} ta dars + shadowing (30–40 daqiqa).\n` : '') + `\nBugun ham 🔥 seriyangizni uzmang!`,
    extra: tg.kb([[{ text: '📱 Ilovani ochish', url: `${APP}/?code=${u.code}#day/${day}` }]]),
  }));
  await cfgRef.set({ announcedDay: day, announcedAt: now() }, { merge: true });
  return { day, ...r };
}
exports.handler = async () => { try { const r = await run(); console.log('morning', r); return { statusCode: 200, body: JSON.stringify(r) }; } catch (e) { console.error(e); return { statusCode: 500, body: 'err' }; } };
exports.run = run;
