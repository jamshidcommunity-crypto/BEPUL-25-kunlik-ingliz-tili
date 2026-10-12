// Send a message to many users without hitting Telegram's ~30 msg/s limit.
const tg = require('./tg');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function broadcast(items, build, { perSecond = 25, deadlineMs = 24000 } = {}) {
  const t0 = Date.now(); let sent = 0, failed = 0;
  for (let i = 0; i < items.length; i += perSecond) {
    if (Date.now() - t0 > deadlineMs) break;
    const batch = items.slice(i, i + perSecond);
    const res = await Promise.allSettled(batch.map(it => { const m = build(it); return m ? tg.send(it.id || it.uid, m.text, m.extra) : null; }));
    res.forEach(r => (r.status === 'fulfilled' ? sent++ : failed++));
    if (i + perSecond < items.length) await sleep(1050);
  }
  return { sent, failed };
}
module.exports = { broadcast };
