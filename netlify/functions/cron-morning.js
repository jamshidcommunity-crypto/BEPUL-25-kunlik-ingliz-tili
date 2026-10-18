// Scheduled every day 08:00 Tashkent (03:00 UTC, see netlify.toml).
// Each calendar day of the course (from startDate, see lib/course.js) every student with a code gets a morning message once.
const { col, now } = require('./lib/db');
const tg = require('./lib/tg');
const { broadcast } = require('./lib/broadcast');
const { calendarDay } = require('./lib/course');
let DAYS = []; try { DAYS = require('./lib/days.json'); } catch (e) {}
const APP = process.env.APP_URL || '';

async function run() {
  const cfgRef = col('b25_config').doc('main');
  const cfg = (await cfgRef.get()).data() || {};
  const day = calendarDay(cfg);
  if (day < 1) return { skipped: true, day, reason: 'kurs hali boshlanmagan' };
  if ((cfg.announcedDay || 0) >= day) return { skipped: true, day };
  const d = DAYS.find(x => x.day === day) || { title: '' };
  const users = (await col('b25_users').get()).docs.map(x => x.data()).filter(u => u.code);
  // social proof: how many finished yesterday's day (all its units answered + shadowing)
  const prevD = DAYS.find(x => x.day === day - 1);
  const prog = {}; (await col('b25_progress').get()).docs.forEach(x => { prog[x.id] = x.data(); });
  const finished = (p) => !!p && !!prevD && (prevD.unitIds || []).every(id => p.units && p.units[id]) && !!(p.shadow && p.shadow[prevD.day]);
  const nFinished = prevD ? Object.values(prog).filter(p => p.uid !== 'master' && finished(p)).length : 0;
  const r = await broadcast(users, (u) => {
    const p = prog[String(u.id)];
    const behind = prevD && !finished(p);
    return {
      text: `☀️ Xayrli tong, ${tg.esc((u.name || '').split(' ')[0])}!\n\n📘 <b>Day ${day}</b> ochildi: <b>${tg.esc(d.title)}</b>\n` +
        (d.units ? `Bugun: ${d.units} ta dars + shadowing (30–40 daqiqa).\n` : '') +
        (nFinished ? `\n👏 Kecha <b>${nFinished} kishi</b> Day ${prevD.day} ni tugatdi.` : '') +
        (behind ? `\n⏳ Siz Day ${prevD.day} ni hali tugatmagansiz — avval uni yakunlang, Day ${day} shundan keyin ochiladi.` : '') +
        `\n\nBugun ham 🔥 seriyangizni uzmang!`,
      extra: tg.kb([[{ text: '📱 Ilovani ochish', url: `${APP}/?code=${u.code}#day/${behind ? prevD.day : day}` }]]),
    };
  });
  await cfgRef.set({ announcedDay: day, announcedAt: now() }, { merge: true });
  return { day, ...r };
}
exports.handler = async () => { try { const r = await run(); console.log('morning', r); return { statusCode: 200, body: JSON.stringify(r) }; } catch (e) { console.error(e); return { statusCode: 500, body: 'err' }; } };
exports.run = run;
