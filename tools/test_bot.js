#!/usr/bin/env node
// Offline test of the bot flow with an in-memory Firestore mock and a fake Telegram API.
const path = require('path');
const FN = path.join(__dirname, '..', 'netlify', 'functions');
process.env.BOT_TOKEN = 'x'; process.env.CLOSED_CHANNEL_ID = '-100777'; process.env.ADMIN_IDS = '1'; process.env.MASTER_CODE = 'B25-MASTER';

// ---- Firestore mock ----
const store = {};
const INC = Symbol('inc');
const mockDb = {
  col(name) {
    store[name] = store[name] || {};
    const c = store[name];
    const applyMerge = (old, data) => { const o = { ...(old || {}) }; for (const [k, v] of Object.entries(data)) o[k] = v && v[INC] !== undefined ? (o[k] || 0) + v[INC] : v; return o; };
    const docRef = (id) => ({
      async get() { const d = c[id]; return { exists: !!d, data: () => d, id }; },
      async set(data, opt) { c[id] = opt && opt.merge ? applyMerge(c[id], data) : applyMerge({}, data); },
    });
    const q = (filter) => ({
      where: (f, op, v) => q(d => filter(d) && d[f] === v),
      orderBy: () => q(filter), limit: () => q(filter),
      async get() { const docs = Object.entries(c).filter(([, d]) => filter(d)).map(([id, d]) => ({ id, data: () => d })); return { docs, size: docs.length }; },
    });
    return { doc: docRef, ...q(() => true) };
  },
  now: () => Date.now(), inc: (n) => ({ [INC]: n }),
};
require.cache[require.resolve(FN + '/lib/db.js')] = { id: 'db', filename: 'db', loaded: true, exports: mockDb };

// ---- Telegram mock ----
const members = { '@jamshid_akhatkulov_en': new Set(), '@Imamov_academy': new Set() };
const sent = [];
const mockTg = {
  send: async (chat, text, extra) => { sent.push({ chat: String(chat), text }); },
  answerCb: async () => {},
  isMember: async (chat, uid) => members[chat] ? members[chat].has(String(uid)) : false,
  oneTimeInvite: async () => 'https://t.me/+ONETIME',
  kb: (rows) => ({ reply_markup: { inline_keyboard: rows } }),
  esc: (s) => String(s),
};
require.cache[require.resolve(FN + '/lib/tg.js')] = { id: 'tg', filename: 'tg', loaded: true, exports: mockTg };

const bot = require(FN + '/bot.js');
const verify = require(FN + '/verify.js');
const progress = require(FN + '/progress.js');
const msg = (id, text, name) => bot.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ message: { chat: { type: 'private', id }, from: { id, first_name: name || 'User' + id, username: 'u' + id }, text } }) });
const cb = (id, data) => bot.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ callback_query: { id: 'cq', data, from: { id, first_name: 'User' + id, username: 'u' + id } } }) });
const last = (id) => sent.filter(s => s.chat === String(id)).slice(-1)[0]?.text || '';
let fails = 0; const ok = (cond, m) => { console.log((cond ? 'PASS ' : 'FAIL ') + m); if (!cond) fails++; };

(async () => {
  const join = async (uid, ch) => { members[ch].add(String(uid)); await bot.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ chat_member: { chat: { id: -1, type: 'channel', username: ch.replace('@','') }, from: { id: uid }, old_chat_member: { status: 'left', user: { id: uid } }, new_chat_member: { status: 'member', user: { id: uid } } } }) }); };
  await msg(10, '/start', 'Aziz');
  ok(/Beginner 25/.test(last(10)) && /ref_10/.test(last(10)), 'welcome with own link');
  // three friends join via link, no button pressed
  for (const f of [11, 12, 13]) {
    await msg(f, '/start ref_10', 'Friend' + f);
    ok(/avtomatik oʻtadi/.test(last(10)), `referrer notified of ${f}`);
    await join(f, '@jamshid_akhatkulov_en');
    ok(!store.b25_users[String(f)].joined, `friend ${f} not counted after 1 channel`);
    await join(f, '@Imamov_academy');
    ok(store.b25_users[String(f)].joined, `friend ${f} auto-counted after both channels`);
    ok(/hisobga oʻtdingiz|hisobiga oʻtdingiz/.test(last(f)), `friend ${f} told he counted`);
  }
  ok(store.b25_users['10'].invites === 3, 'referrer has 3 invites');
  ok(!store.b25_users['10'].code && /oʻzingiz ham ikkala kanalga/.test(last(10)), 'referrer not in channels → asked to join first');
  await join(10, '@jamshid_akhatkulov_en'); await join(10, '@Imamov_academy');
  const u10 = store.b25_users['10'];
  ok(!!u10.code && /^B25-[A-Z2-9]{5}$/.test(u10.code), 'code issued after referrer joins: ' + u10.code);
  ok(/Tabriklaymiz/.test(sent.filter(s => s.chat === '10').map(s => s.text).join('\n')) && /ONETIME/.test(sent.filter(s => s.chat === '10').map(s => s.text).join('\n')), 'congrats + one-time link sent');
  // already-member friend counts on /start
  members['@jamshid_akhatkulov_en'].add('20'); members['@Imamov_academy'].add('20');
  await msg(21, '/start'); await join(21, '@jamshid_akhatkulov_en'); await join(21, '@Imamov_academy');
  await msg(20, '/start ref_21');
  ok(store.b25_users['21'].invites === 1, 'existing member counted at /start');
  // no double count / self referral / stranger join
  await join(11, '@Imamov_academy'); await msg(11, '/holat'); await msg(14, '/start ref_14');
  await join(999, '@Imamov_academy');
  ok(store.b25_users['10'].invites === 3, 'no double count, self-ref ignored');
  // verify endpoint
  let r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: u10.code.toLowerCase() } })).body);
  ok(r.ok && r.uid === '10' && r.name === 'Aziz', 'verify valid code → user');
  r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: 'B25-NOPE1' } })).body);
  ok(!r.ok, 'verify invalid code rejected');
  r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: 'b25-master' } })).body);
  ok(r.ok && r.master, 'master code works');
  r = JSON.parse((await progress.handler({ httpMethod: 'POST', body: JSON.stringify({ code: u10.code, name: 'Aziz', units: { 1: { score: 18 }, 2: { score: 9 } }, shadow: { 1: true }, test: null }) })).body);
  ok(r.ok && store.b25_progress['10'].units['1'].score === 18, 'progress saved');
  await msg(10, '/holat');
  ok(/1\/34/.test(last(10)) && /3\/3/.test(last(10)), 'status shows progress and invites');
  await msg(1, '/start'); await msg(1, '/stat');
  ok(/Foydalanuvchilar: <b>\d+<\/b>/.test(last(1)), 'admin /stat');
  await msg(1, '/kun 7');
  ok(store.b25_config.main.openDay === 7, 'admin /kun sets openDay');

  // progress: badges congratulated once, final pass message
  sent.length=0;
  await progress.handler({ httpMethod: 'POST', body: JSON.stringify({ code: u10.code, name: 'Aziz', units: { 1: { score: 17.5 } }, shadow: {}, test: null, badges: ['first','perfect','bogus'], streak: 3 }) });
  ok(sent.filter(s=>s.chat==='10' && /Yangi nishon/.test(s.text)).length===2, 'two new badges congratulated (bogus ignored)');
  ok(store.b25_progress['10'].units['1'].score===17.5 && store.b25_progress['10'].points>0, 'half points kept, points computed');
  sent.length=0;
  await progress.handler({ httpMethod: 'POST', body: JSON.stringify({ code: u10.code, name: 'Aziz', units: { 1: { score: 18 } }, shadow: {1:true}, test: {score:33}, badges: ['first','perfect','final'] }) });
  ok(sent.some(s=>/Tabriklaymiz/.test(s.text)) && sent.filter(s=>/Yangi nishon/.test(s.text)).length===1, 'final pass message + only new badge');
  // leaderboard
  const lb = require(FN + '/leaderboard.js');
  r = JSON.parse((await lb.handler({ queryStringParameters: { code: u10.code } })).body);
  ok(r.ok && r.me && r.me.rank===1 && r.top[0].me, 'leaderboard ranks me first');
  // cron morning: announces once per new day
  const morning = require(FN + '/cron-morning.js');
  sent.length=0; let m = await morning.run();
  ok(!m.skipped && m.day===7 && sent.some(s=>/Day 7/.test(s.text)), 'morning announces day 7');
  m = await morning.run(); ok(m.skipped, 'morning not repeated for same day');
  // cron evening: inactive reminder
  const evening = require(FN + '/cron-evening.js');
  store.b25_progress['10'].lastActive = Date.now() - 3*864e5;
  sent.length=0; const ev = await evening.run(Date.UTC(2026,9,14,14));
  ok(sent.some(s=>s.chat==='10' && /koʻrmayapmiz/.test(s.text)), 'evening reminder for inactive user');
  sent.length=0; await evening.run(Date.UTC(2026,9,14,15)); ok(!sent.some(s=>/koʻrmayapmiz/.test(s.text)), 'no repeat reminder same day');
  sent.length=0; await evening.run(Date.UTC(2026,9,18,14)); ok(sent.some(s=>/Haftaning eng faol/.test(s.text)), 'sunday weekly top');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
