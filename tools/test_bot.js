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
  await msg(10, '/start', 'Aziz');
  ok(/Beginner 25/.test(last(10)), 'welcome sent');
  await cb(10, 'check');
  ok(/aʼzo boʻlmagan kanal/.test(last(10)), 'not a member → asked to join');
  members['@jamshid_akhatkulov_en'].add('10'); members['@Imamov_academy'].add('10');
  await cb(10, 'check');
  ok(/ikkala kanalga aʼzosiz/.test(last(10)) && /ref_10/.test(last(10)), 'member of both → referral link');
  // three friends
  for (const f of [11, 12, 13]) {
    await msg(f, '/start ref_10', 'Friend' + f);
    ok(/havolangiz orqali kirdi/.test(last(10)), `referrer notified of ${f}`);
    await cb(f, 'check');
    ok(/aʼzo boʻlmagan/.test(last(f)), `friend ${f} must join first`);
    members['@jamshid_akhatkulov_en'].add(String(f)); members['@Imamov_academy'].add(String(f));
    await cb(f, 'check');
  }
  const u10 = store.b25_users['10'];
  ok(u10.invites === 3, 'referrer has 3 invites (' + u10.invites + ')');
  ok(!!u10.code && /^B25-[A-Z2-9]{5}$/.test(u10.code), 'code issued: ' + u10.code);
  ok(/Tabriklaymiz/.test(sent.filter(s => s.chat === '10').map(s => s.text).join('\n')) && /ONETIME/.test(sent.filter(s => s.chat === '10').map(s => s.text).join('\n')), 'congrats + one-time link sent');
  // self-referral & duplicate check don't count
  await msg(14, '/start ref_14'); await cb(10, 'check');
  ok(store.b25_users['10'].invites === 3, 'self-referral / re-check does not add');
  await cb(11, 'check');
  ok(store.b25_users['10'].invites === 3, 'friend re-check does not double count');
  // verify endpoint
  let r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: u10.code.toLowerCase() } })).body);
  ok(r.ok && r.uid === '10' && r.name === 'Aziz', 'verify valid code → user');
  r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: 'B25-NOPE1' } })).body);
  ok(!r.ok, 'verify invalid code rejected');
  r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: 'b25-master' } })).body);
  ok(r.ok && r.master, 'master code works');
  // progress endpoint
  r = JSON.parse((await progress.handler({ httpMethod: 'POST', body: JSON.stringify({ code: u10.code, name: 'Aziz', units: { 1: { score: 18 }, 2: { score: 9 } }, shadow: { 1: true }, test: null }) })).body);
  ok(r.ok && store.b25_progress['10'].units['1'].score === 18, 'progress saved');
  await msg(10, '/holat');
  ok(/1\/34/.test(last(10)) && /3\/3/.test(last(10)), 'status shows progress and invites');
  // admin
  await msg(1, '/start'); await msg(1, '/stat');
  ok(/Foydalanuvchilar: <b>6<\/b>/.test(last(1)), 'admin /stat');
  await msg(1, '/kun 7');
  ok(store.b25_config.main.openDay === 7, 'admin /kun sets openDay');
  r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: u10.code } })).body);
  ok(r.openDay === 7, 'verify returns openDay from config');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
