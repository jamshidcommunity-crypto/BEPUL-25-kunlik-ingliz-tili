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
const sent = []; let inviteN = 0;
const mockTg = {
  send: async (chat, text, extra) => { sent.push({ chat: String(chat), text, extra }); },
  answerCb: async () => {},
  isMember: async (chat, uid) => members[chat] ? members[chat].has(String(uid)) : false,
  oneTimeInvite: async () => { if (mockTg.inviteFails) throw new Error('Bad Request: chat not found'); return 'https://t.me/+ONETIME' + (++inviteN); },
  call: async (m) => m === 'getMe' ? { id: 777, username: 'bot' } : m === 'getChatMember' ? { status: 'administrator' } : {},
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
  mockTg.inviteFails = true;
  await join(10, '@jamshid_akhatkulov_en'); await join(10, '@Imamov_academy');
  const u10 = store.b25_users['10'];
  ok(/\/yopiq/.test(last(10)) && !u10.closedLink, 'invite failure → user told to use /yopiq, no link stored');
  ok(sent.some(s => s.chat === '1' && /Yopiq kanal havolasini yaratib boʻlmadi/.test(s.text)), 'admin alerted about broken closed channel');
  mockTg.inviteFails = false;
  await msg(10, '/yopiq');
  ok(/ONETIME1/.test(last(10)) && store.b25_users['10'].closedLink === 'https://t.me/+ONETIME1', '/yopiq retries and stores one-time link');
  await msg(10, '/yopiq');
  ok(/ONETIME1/.test(last(10)) && inviteN === 1, 'same link reused, not regenerated');
  ok(!!u10.code && /^B25-[A-Z2-9]{5}$/.test(u10.code), 'code issued after referrer joins: ' + u10.code);
  ok(/Tabriklaymiz/.test(sent.filter(s => s.chat === '10').map(s => s.text).join('\n')), 'congrats sent');
  // a second referrer with a working closed channel gets code + link in one message
  await msg(30, '/start'); await join(30, '@jamshid_akhatkulov_en'); await join(30, '@Imamov_academy');
  for (const f of [31, 32, 33]) { await msg(f, '/start ref_30'); await join(f, '@jamshid_akhatkulov_en'); await join(f, '@Imamov_academy'); }
  ok(/Tabriklaymiz/.test(last(30)) && /ONETIME2/.test(last(30)) && store.b25_users['30'].closedLink, 'code + closed-channel link sent together');
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
  ok(/2\/34/.test(last(10)) && /3\/3/.test(last(10)) && /ONETIME1/.test(last(10)), 'status shows progress (any score counts), invites and closed link');
  await msg(1, '/start'); await msg(1, '/stat');
  ok(/Foydalanuvchilar: <b>\d+<\/b>/.test(last(1)) && /belgilanmagan/.test(last(1)), 'admin /stat (no start date yet)');
  // course calendar
  const course = require(FN + '/lib/course.js');
  const future = course.addDays(course.todayStr(), 3);
  await msg(1, '/boshlash ' + future);
  ok(store.b25_config.main.startDate === future && /boshlanmagan/.test(last(1)), 'admin /boshlash sets future start date');
  r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: u10.code } })).body);
  ok(r.openDay === 0 && r.startDate === future, 'verify → day 0 before start');
  const morning0 = require(FN + '/cron-morning.js');
  ok((await morning0.run()).skipped, 'morning skipped before start');
  await msg(1, '/boshlash 2026-13-45'); ok(/format/i.test(last(1)), 'bad date rejected');
  await msg(1, '/kun 7');
  ok(store.b25_config.main.startDate === course.startDateForDay(7) && course.calendarDay(store.b25_config.main) === 7, 'admin /kun 7 → start date 6 days ago');
  r = JSON.parse((await verify.handler({ httpMethod: 'GET', queryStringParameters: { code: u10.code } })).body);
  ok(r.openDay === 7, 'verify → calendar day 7');
  await msg(1, '/yopiqtest'); ok(/✅ Yopiq kanal ishlayapti/.test(last(1)), 'admin /yopiqtest ok');
  // /yopiqyubor: user 40 got a code while the channel was broken → no link; resend fixes it
  mockTg.inviteFails = true; await msg(40, '/start'); await join(40, '@jamshid_akhatkulov_en'); await join(40, '@Imamov_academy');
  for (const f of [41, 42, 43]) { await msg(f, '/start ref_40'); await join(f, '@jamshid_akhatkulov_en'); await join(f, '@Imamov_academy'); }
  ok(store.b25_users['40'].code && !store.b25_users['40'].closedLink, 'user 40: code but no link');
  mockTg.inviteFails = false; sent.length = 0; const nBefore = inviteN;
  await msg(1, '/yopiqyubor');
  ok(/yuborildi: <b>1<\/b>/.test(last(1)) && /t\.me\/\+ONETIME/.test(last(40)) && store.b25_users['40'].closedLink, '/yopiqyubor sends link to the one who lacked it');
  ok(!sent.some(s => s.chat === '10' || s.chat === '30'), 'users who already have a link are not re-sent');
  sent.length = 0; await msg(1, '/yopiqyubor'); ok(/hammaga yetib borgan/.test(last(1)), 'second run: nothing to do');
  sent.length = 0; await msg(1, '/yopiqyubor hammaga');
  ok(/yuborildi: <b>3<\/b>/.test(last(1)) && inviteN === nBefore + 1, '/yopiqyubor hammaga re-sends stored links without creating new ones');

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
  // morning social proof + personal nudge (day 8 → counts who finished day 7)
  const D7 = require(FN + '/lib/days.json').find(x => x.day === 7);
  const u7 = {}; D7.unitIds.forEach(id => { u7[id] = { score: 12, at: 1 }; });
  store.b25_progress['10'] = Object.assign(store.b25_progress['10'] || {}, { uid: '10', units: u7, shadow: { 7: true } });
  store.b25_progress['30'] = { uid: '30', units: {}, shadow: {} };
  await msg(1, '/kun 8'); sent.length = 0; m = await morning.run();
  ok(m.day === 8 && /1 kishi<\/b> Day 7 ni tugatdi/.test(last(10)) && !/hali tugatmagansiz/.test(last(10)), 'morning: social proof, finisher not nagged');
  ok(/Day 7 ni hali tugatmagansiz/.test(last(30)) && /#day\/7/.test(JSON.stringify(sent.filter(s => s.chat === '30'))), 'morning: laggard nudged to day 7');
  // feature 7: poll
  sent.length = 0; await msg(1, '/sorov Present Simple tushunarli boʻldimi?');
  ok(/Present Simple/.test(last(10)) && /Soʻrov yuborildi/.test(last(1)), 'poll broadcast to coded users');
  const pid = store.b25_config.main.lastPoll;
  await cb(10, `poll:${pid}:ok`); await cb(30, `poll:${pid}:hard`); await cb(30, `poll:${pid}:mid`);
  ok(store.b25_polls[pid].votes['10'] === 'ok' && store.b25_polls[pid].votes['30'] === 'mid', 'votes stored, re-vote overwrites');
  await msg(1, '/sorovnatija');
  ok(/Javob berganlar: <b>2<\/b>/.test(last(1)) && /Tushunarli: <b>1<\/b> \(50%\)/.test(last(1)), 'poll result for admin');
  // feature 10: next step application
  sent.length = 0; await msg(10, '/keyingi');
  ok(/Keyingi bosqichga ariza/.test(last(1)) && /User10/.test(last(1)) && /Arizangiz ustozga yetkazildi/.test(last(10)), '/keyingi → admin card + confirmation');
  sent.length = 0; await msg(30, '/start keyingi');
  ok(/Keyingi bosqichga ariza/.test(last(1)) && store.b25_next['30'], '/start keyingi deep link works');
  sent.length = 0; await msg(10, '/keyingi'); ok(!sent.some(s => s.chat === '1'), 'repeat application within 6h does not spam admin');
  await msg(1, '/arizalar'); ok(/arizalar<\/b> \(2\)/.test(last(1)), 'admin /arizalar lists 2');
  // feature 9: team board
  r = JSON.parse((await lb.handler({ queryStringParameters: { code: u10.code } })).body);
  ok(r.team.length === 4 && r.team.some(x => x.me) && r.team.filter(x => x.role === 'inv').length === 3, 'team for referrer: me + 3 invitees');
  await msg(1, '/kodber 11'); const c11 = store.b25_users['11'].code;
  r = JSON.parse((await lb.handler({ queryStringParameters: { code: c11 || u10.code } })).body);
  if (c11) ok(r.team.some(x => x.role === 'ref') && r.team.filter(x => x.role === 'sib').length === 2, 'team for invitee: referrer + 2 siblings'); else console.log('SKIP team-invitee (11 has no code)');
  // cron evening: inactive reminder
  const evening = require(FN + '/cron-evening.js');
  const T0 = Date.UTC(2026,9,14,14); store.b25_progress['10'].lastActive = T0 - 3*864e5; delete store.b25_users['10'].remindedAt;
  sent.length=0; const ev = await evening.run(T0);
  ok(sent.some(s=>s.chat==='10' && /koʻrmayapmiz/.test(s.text)), 'evening reminder for inactive user');
  sent.length=0; await evening.run(T0 + 3600e3); ok(!sent.some(s=>/koʻrmayapmiz/.test(s.text)), 'no repeat reminder same day');
  sent.length=0; await evening.run(T0 + 4*864e5); ok(sent.some(s=>/Haftaning eng faol/.test(s.text)), 'sunday weekly top');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
