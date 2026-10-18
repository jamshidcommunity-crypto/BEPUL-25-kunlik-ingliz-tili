// Telegram webhook for @InglizTili0danBot — referral gate for the Beginner 25 course.
// Flow: friend opens the referrer's link (t.me/<bot>?start=ref_<id>) → presses Start → joins BOTH channels.
// The bot sees the joins itself (chat_member updates; bot must be admin in both channels) — no button needed.
// When a referrer has REQUIRED (3) friends in both channels (and is in both channels himself), the bot sends
// an app access code + a one-time link to the closed channel.
const { col, now, inc } = require('./lib/db');
const tg = require('./lib/tg');
const course = require('./lib/course');

const ENV = {
  BOT: process.env.BOT_USERNAME || 'InglizTili0danBot',
  CH1: process.env.CHANNEL_1 || '@jamshid_akhatkulov_en',
  CH2: process.env.CHANNEL_2 || '@Imamov_academy',
  CLOSED: normChat(process.env.CLOSED_CHANNEL_ID), // e.g. -1001234567890 (a bare 1001234567890 / 1234567890 is fixed automatically)
  CLOSED_LINK: process.env.CLOSED_INVITE_LINK || '', // optional: permanent invite link used when the bot cannot create one-time links
  APP: process.env.APP_URL || 'https://beginner25.netlify.app',
  REQUIRED: parseInt(process.env.REQUIRED_INVITES || '3', 10),
  ADMINS: (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  SECRET: process.env.WEBHOOK_SECRET || '',
};
function normChat(v) { v = String(v || '').trim(); if (!v) return ''; if (/^@/.test(v)) return v; if (/^-100\d+$/.test(v)) return v; if (/^100\d{6,}$/.test(v)) return '-' + v; if (/^-?\d+$/.test(v)) return '-100' + v.replace('-', ''); return v; }
const norm = (ch) => String(ch || '').replace('@', '').toLowerCase();
const isOurChannel = (chat) => chat && chat.username && [norm(ENV.CH1), norm(ENV.CH2)].includes(chat.username.toLowerCase());
const chUrl = (ch) => `https://t.me/${String(ch).replace('@', '')}`;
const refLink = (id) => `https://t.me/${ENV.BOT}?start=ref_${id}`;
const SHARE_TEXT = 'Ingliz tilini 0 dan BEPUL oʻrganamiz — 25 kunlik kurs, Imamov Academy. Havolani bosing, «Start» ni bosing va 2 ta kanalga qoʻshiling:';
const shareUrl = (id) => `https://t.me/share/url?url=${encodeURIComponent(refLink(id))}&text=${encodeURIComponent(SHARE_TEXT)}`;
const users = () => col('b25_users');

function genCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return 'B25-' + s;
}
const channelsKb = (extra = []) => tg.kb([
  [{ text: `➕ ${ENV.CH1}`, url: chUrl(ENV.CH1) }],
  [{ text: `➕ ${ENV.CH2}`, url: chUrl(ENV.CH2) }],
  ...extra,
]);
const shareRow = (id) => [{ text: '📤 Doʻstlarga ulashish', url: shareUrl(id) }];
const mainKb = (id) => channelsKb([shareRow(id), [{ text: '📊 Holatim', callback_data: 'status' }]]);

async function getUser(id) { const d = await users().doc(String(id)).get(); return d.exists ? d.data() : null; }

// Invite link to the closed channel for this user: stored one-time link → new one-time link → permanent CLOSED_INVITE_LINK.
async function closedLink(u) {
  if (!u) return null;
  if (u.closedLink) return u.closedLink;
  if (ENV.CLOSED) {
    try {
      const link = await tg.oneTimeInvite(ENV.CLOSED, u.name);
      await users().doc(String(u.id)).set({ closedLink: link, closedLinkAt: now() }, { merge: true });
      return link;
    } catch (e) {
      console.error('invite', e.message);
      await alertAdmins(`⚠️ Yopiq kanal havolasini yaratib boʻlmadi (${tg.esc(e.message)}).\nCLOSED_CHANNEL_ID = <code>${ENV.CLOSED}</code>. Bot yopiq kanalda admin va «Invite users» huquqi bormi? Tekshirish: /yopiqtest`);
    }
  } else await alertAdmins('⚠️ CLOSED_CHANNEL_ID Netlify’da yoʻq — oʻquvchilar yopiq kanal havolasini ololmayapti.');
  return ENV.CLOSED_LINK || null;
}
// Admin alert at most once per hour (so a broken channel id does not spam).
async function alertAdmins(text) {
  try {
    const ref = col('b25_config').doc('main'); const c = (await ref.get()).data() || {};
    const t = c.alertAt && c.alertAt.toMillis ? c.alertAt.toMillis() : (c.alertAt || 0);
    if (Date.now() - t < 3600e3) return;
    await ref.set({ alertAt: Date.now() }, { merge: true });
    for (const a of ENV.ADMINS) await tg.send(a, text).catch(() => {});
  } catch (e) { console.error('alert', e.message); }
}
const closedRow = (link) => link ? [[{ text: '🔒 Yopiq kanalga kirish', url: link }]] : [[{ text: '🔒 Yopiq kanal havolasi', callback_data: 'closed' }]];

async function checkMembership(id) {
  const [a, b] = await Promise.all([tg.isMember(ENV.CH1, id), tg.isMember(ENV.CH2, id)]);
  const missing = [];
  if (!a) missing.push(ENV.CH1);
  if (!b) missing.push(ENV.CH2);
  return missing;
}

// Core: re-evaluate one user. Marks him "joined" when he is in both channels, credits his referrer once,
// and issues his own code if he already has enough friends. Safe to call any number of times.
async function evaluate(uid, { quiet } = {}) {
  uid = String(uid);
  let u = await getUser(uid);
  if (!u) return null;
  let missing;
  try { missing = await checkMembership(uid); } catch (e) { console.error('membership', e.message); return u; }
  if (missing.length) return Object.assign(u, { missing });
  if (!u.joined) {
    await users().doc(uid).set({ joined: true, joinedAt: now() }, { merge: true });
    if (u.ref && !u.credited) {
      await users().doc(uid).set({ credited: true }, { merge: true });
      await users().doc(u.ref).set({ invites: inc(1) }, { merge: true });
      const r = await getUser(u.ref);
      const n = r.invites || 0;
      await tg.send(u.ref, `✅ <b>${tg.esc(u.name)}</b> ikkala kanalga qoʻshildi va hisobingizga oʻtdi. Taklif qilganlaringiz: <b>${Math.min(n, ENV.REQUIRED)}/${ENV.REQUIRED}</b>` +
        (n >= ENV.REQUIRED ? '' : `\nYana <b>${ENV.REQUIRED - n}</b> ta doʻst qoldi.`)).catch(() => {});
      if (n >= ENV.REQUIRED && !r.code) {
        if (r.joined) await issueCode(u.ref);
        else await tg.send(u.ref, `🎯 ${ENV.REQUIRED} ta doʻst yigʻildi! Kodni olish uchun oʻzingiz ham ikkala kanalga qoʻshiling:`, channelsKb()).catch(() => {});
      }
    }
    if (!quiet) {
      await tg.send(uid, `✅ Ajoyib, siz ikkala kanalga qoʻshildingiz!` + (u.ref ? ' Doʻstingiz hisobiga oʻtdingiz.' : '') +
        `\n\nEndi oʻzingiz ham kursga kiring: <b>${ENV.REQUIRED} ta doʻstingizni</b> taklif qiling. Sizning havolangiz:\n${refLink(uid)}`,
        tg.kb([shareRow(uid), [{ text: '📊 Holatim', callback_data: 'status' }]])).catch(() => {});
    }
    u = await getUser(uid);
  }
  if ((u.invites || 0) >= ENV.REQUIRED && !u.code) { await issueCode(uid); u = await getUser(uid); }
  return u;
}

async function onStart(from, payload) {
  const id = String(from.id);
  const u = await getUser(id);
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  let ref = null;
  if (!u) {
    const m = /^ref_(\d+)$/.exec(payload || '');
    ref = m && m[1] !== id && (await getUser(m[1])) ? m[1] : null;
    await users().doc(id).set({ id, name, username: from.username || '', ref, joined: false, credited: false, invites: 0, code: null, createdAt: now() });
    if (ref) await tg.send(ref, `👋 <b>${tg.esc(name)}</b> sizning havolangiz orqali kirdi. Ikkala kanalga qoʻshilishi bilan hisobingizga avtomatik oʻtadi.`).catch(() => {});
  } else if (u.name !== name || u.username !== (from.username || '')) {
    await users().doc(id).set({ name, username: from.username || '' }, { merge: true });
  }
  if (payload === 'keyingi') return onNext(from);
  const after = await evaluate(id, { quiet: false });
  if (after && after.joined) return sendStatus(id, after);
  await tg.send(id,
    `Assalomu alaykum, <b>${tg.esc(from.first_name)}</b>! 👋\n\n` +
    `<b>Beginner 25</b> — ingliz tilini 0 dan oʻrganish uchun 25 kunlik <b>bepul</b> kurs (Imamov Academy).\n\n` +
    `1️⃣ Pastdagi <b>ikkala kanalga</b> qoʻshiling — bot buni oʻzi koʻradi, hech narsa bosish shart emas.\n` +
    `2️⃣ <b>${ENV.REQUIRED} ta doʻstingizni</b> oʻz havolangiz orqali taklif qiling — ular ham ikkala kanalga qoʻshilsa, avtomatik hisobga oʻtadi.\n\n` +
    `Shundan keyin bot sizga <b>ilovaga kirish kodini</b> va <b>yopiq kanal havolasini</b> yuboradi. 🎁\n\n` +
    `🔗 Sizning havolangiz:\n${refLink(id)}`,
    mainKb(id));
}

async function issueCode(uid) {
  uid = String(uid);
  const u = await getUser(uid);
  if (!u) return;
  let code = u.code;
  if (!code) {
    code = genCode();
    await col('b25_codes').doc(code).set({ uid, createdAt: now() });
    await users().doc(uid).set({ code, codeAt: now() }, { merge: true });
  }
  const link = await closedLink(Object.assign(u, { code }));
  await tg.send(uid,
    `🎉 <b>Tabriklaymiz!</b> ${ENV.REQUIRED} ta doʻstingiz qoʻshildi.\n\n` +
    `🔑 Ilovaga kirish kodingiz: <code>${code}</code>\n` +
    `📱 Ilova: ${ENV.APP}/?code=${code}\n   Havolani <b>Chrome</b> (Android/kompyuter) yoki <b>Safari</b> (iPhone) da oching va «Oʻrnatish» ni bosing — ilova telefoningizga oʻrnatiladi.\n\n` +
    (link ? `🔒 Yopiq kanal (onlayn darslar shu yerda): ${link}\n   <i>Havola faqat siz uchun, 1 marta ishlaydi — hozir kirib qoʻying.</i>` : `🔒 Yopiq kanal havolasi hozircha tayyor emas — pastdagi tugmani yoki /yopiq ni bosing, biroz vaqtdan keyin yana urinib koʻring.`),
    tg.kb([[{ text: '📱 Ilovani ochish', url: `${ENV.APP}/?code=${code}` }], ...closedRow(link)]));
}

async function sendClosed(id) {
  const u = await evaluate(id, { quiet: true });
  if (!u || !u.code) return tg.send(id, `Yopiq kanal havolasi kod bilan birga beriladi. Avval ${ENV.REQUIRED} ta doʻst taklif qiling: ${refLink(id)}`, tg.kb([shareRow(id)]));
  const link = await closedLink(u);
  return tg.send(id, link ? `🔒 Yopiq kanal havolangiz (1 marta ishlaydi):\n${link}` : `Havola hozircha tayyor emas — ustoz xabardor qilindi, birozdan keyin /yopiq ni qayta bosing.`, link ? tg.kb(closedRow(link)) : undefined);
}

// Feature 10: application for the next course (Elementary). Student presses the button → admins get a card.
async function onNext(from) {
  const id = String(from.id);
  const u = await getUser(id);
  const p = (await col('b25_progress').doc(id).get()).data() || {};
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || (u && u.name) || 'Oʻquvchi';
  const ref = col('b25_next').doc(id);
  const prev = (await ref.get()).data();
  await ref.set({ id, name, username: from.username || '', lessons: p.lessons || 0, test: p.test ? p.test.score : null, points: p.points || 0, at: now(), count: inc(1) }, { merge: true });
  const prevAt = !prev ? 0 : prev.at && prev.at.toMillis ? prev.at.toMillis() : (typeof prev.at === 'number' ? prev.at : 0);
  if (Date.now() - prevAt > 6 * 3600e3) {
    for (const a of ENV.ADMINS) await tg.send(a, `📝 <b>Keyingi bosqichga ariza</b>\n👤 ${tg.esc(name)} ${from.username ? '@' + from.username : ''} (id <code>${id}</code>)\n📚 ${p.lessons || 0}/34 dars · ${Object.keys(p.shadow || {}).length} shadowing · ${p.points || 0} ball${p.test ? ` · test ${p.test.score}/40` : ''}\n👥 Taklif qilganlari: ${(u && u.invites) || 0}`,
      tg.kb([[{ text: '✍️ Yozish', url: from.username ? `https://t.me/${from.username}` : `tg://user?id=${id}` }]])).catch(() => {});
  }
  return tg.send(id, `✅ <b>Rahmat, ${tg.esc(from.first_name)}!</b> Arizangiz ustozga yetkazildi — tez orada oʻzi yozadi.\n\n🎓 <b>Imamov Academy Elementary</b>: Beginner 25 bitiruvchilari uchun 1-dars bepul va maxsus shartlar.\n📍 Usmat (markaziy bino) va Kamar (2-son texnikum).\n\nShoshayotgan boʻlsangiz hoziroq yozing: @jamshid_akhatkulov · +998 93 633 64 07`);
}

// Feature 7: one-question poll after the online lesson. Admin: /sorov [savol] → everyone with a code gets 3 buttons.
const POLL_OPTS = [['👍 Tushunarli', 'ok'], ['😐 Qisman', 'mid'], ['👎 Qiyin boʻldi', 'hard']];
async function sendPoll(adminId, question) {
  const pid = Date.now().toString(36);
  const q = question || 'Bugungi onlayn dars qanday boʻldi?';
  await col('b25_polls').doc(pid).set({ id: pid, q, at: now(), votes: {} });
  await col('b25_config').doc('main').set({ lastPoll: pid }, { merge: true });
  const list = (await users().get()).docs.map(x => x.data()).filter(x => x.code);
  const r = await require('./lib/broadcast').broadcast(list, () => ({ text: `🗣 <b>${tg.esc(q)}</b>\nBitta tugmani bosing — bu ustozga keyingi darsni yaxshilashga yordam beradi.`, extra: tg.kb([POLL_OPTS.map(([t, v]) => ({ text: t, callback_data: `poll:${pid}:${v}` }))]) }), { deadlineMs: 20000 });
  return tg.send(adminId, `🗣 Soʻrov yuborildi: ${r.sent} ta (xato ${r.failed}). Natija: /sorovnatija`);
}
async function onPollVote(cq) {
  const [, pid, v] = cq.data.split(':');
  const ref = col('b25_polls').doc(pid); const d = (await ref.get()).data();
  if (!d) return tg.answerCb(cq.id, 'Bu soʻrov yopilgan');
  const votes = d.votes || {}; const first = !votes[String(cq.from.id)];
  votes[String(cq.from.id)] = v;
  await ref.set({ votes }, { merge: true });
  await tg.answerCb(cq.id, first ? 'Rahmat! Javobingiz qabul qilindi 🙌' : 'Javobingiz oʻzgartirildi');
  if (first && v === 'hard') await tg.send(cq.from.id, 'Qiyin boʻlgan boʻlsa — ilovada shu kunning «Qoida» boʻlimini qayta oʻqing va mashqlarni qayta ishlang. Savol boʻlsa ustozga yozing: @jamshid_akhatkulov').catch(() => {});
}
async function pollResult(adminId) {
  const cfg = (await col('b25_config').doc('main').get()).data() || {};
  if (!cfg.lastPoll) return tg.send(adminId, 'Hali soʻrov yuborilmagan. /sorov');
  const d = (await col('b25_polls').doc(cfg.lastPoll).get()).data() || {};
  const vs = Object.values(d.votes || {}); const n = vs.length || 1;
  const line = POLL_OPTS.map(([t, v]) => { const c = vs.filter(x => x === v).length; return `${t}: <b>${c}</b> (${Math.round(c / n * 100)}%)`; }).join('\n');
  return tg.send(adminId, `🗣 <b>${tg.esc(d.q || '')}</b>\nJavob berganlar: <b>${vs.length}</b>\n${line}`);
}

async function sendStatus(id, u) {
  u = u || await getUser(id);
  if (!u) return tg.send(id, 'Avval /start ni bosing.');
  const n = u.invites || 0;
  const inv = await users().where('ref', '==', String(id)).get();
  const names = inv.docs.map(d => d.data()).map(x => `• ${tg.esc(x.name)} ${x.joined ? '✅' : '⏳ (hali ikkala kanalga qoʻshilmagan)'}`).join('\n');
  let txt = `📊 <b>Holatingiz</b>\nKanallar: ${u.joined ? 'ikkalasiga aʼzo ✅' : 'hali toʻliq emas ⏳'}\nTaklif qilganlar: <b>${Math.min(n, ENV.REQUIRED)}/${ENV.REQUIRED}</b>\n${names || '• hali hech kim yoʻq'}\n\n🔗 Havolangiz: ${refLink(id)}`;
  if (u.code) {
    const p = await col('b25_progress').doc(String(id)).get();
    const d = p.exists ? p.data() : null;
    const done = d ? Object.keys(d.units || {}).length : 0;
    const link = await closedLink(u);
    txt += `\n\n🔑 Kod: <code>${u.code}</code>\n📱 Ilova: ${ENV.APP}/?code=${u.code}\n🔒 Yopiq kanal: ${link || 'havola hali tayyor emas (/yopiq)'}\n📚 Tugallangan darslar: <b>${done}/34</b>${d && d.test ? ` · Test: ${d.test.score}/40` : ''}`;
    return tg.send(id, txt, tg.kb([[{ text: '📱 Ilovani ochish', url: `${ENV.APP}/?code=${u.code}` }], ...closedRow(link), shareRow(id)]));
  }
  return tg.send(id, txt, u.joined ? tg.kb([shareRow(id)]) : mainKb(id));
}

async function onAdmin(from, text) {
  const id = String(from.id);
  const [cmd, arg] = text.split(/\s+/);
  if (cmd === '/stat') {
    const all = await users().get();
    const d = all.docs.map(x => x.data());
    const joined = d.filter(x => x.joined).length, coded = d.filter(x => x.code).length;
    const top = d.filter(x => x.invites).sort((a, b) => b.invites - a.invites).slice(0, 15).map(x => `• ${tg.esc(x.name)} @${x.username || '-'} — ${x.invites}${x.code ? ' 🔑' : ''}`).join('\n');
    const prog = await col('b25_progress').get();
    const cfg = (await col('b25_config').doc('main').get()).data() || {};
    const cd = course.calendarDay(cfg);
    return tg.send(id, `📅 Boshlanish: <b>${cfg.startDate ? course.fmt(cfg.startDate) : 'belgilanmagan (/boshlash)'}</b> · bugun: <b>${cd ? 'Day ' + cd : 'boshlanmagan'}</b>\n👥 Foydalanuvchilar: <b>${d.length}</b>\n✅ Ikkala kanalga aʼzo: <b>${joined}</b>\n🔑 Kod olganlar: <b>${coded}</b>\n📱 Ilovada ishlayotganlar: <b>${prog.size}</b>\n\n<b>Eng faol taklifchilar:</b>\n${top || '—'}`);
  }
  if (cmd === '/kodber' && arg) { await issueCode(String(arg).replace('@', '')); return tg.send(id, `Kod yuborildi: ${arg}`); }
  if ((cmd === '/boshlash' || cmd === '/sana') && arg) {
    if (!course.parseDate(arg)) return tg.send(id, 'Sana formati: /boshlash 2026-10-27');
    await col('b25_config').doc('main').set({ startDate: arg, openDay: null, updatedAt: now() }, { merge: true });
    const cd = course.calendarDay({ startDate: arg });
    return tg.send(id, `📅 Kurs boshlanish sanasi: <b>${course.fmt(arg)}</b> (${arg}).\nBugun kalendar boʻyicha: <b>${cd ? 'Day ' + cd : 'kurs hali boshlanmagan'}</b>.\nHar kuni 08:00 da yangi kun eʼloni ketadi; oʻquvchi oldingi kunni tugatmasa, keyingisi ochilmaydi.`);
  }
  if (cmd === '/kun' && arg) {
    const n = parseInt(arg, 10);
    if (!(n >= 1 && n <= course.TOTAL)) return tg.send(id, 'Kun 1–25 oraligʻida boʻlsin: /kun 3');
    const sd = course.startDateForDay(n);
    await col('b25_config').doc('main').set({ startDate: sd, openDay: null, updatedAt: now() }, { merge: true });
    return tg.send(id, `Bugun <b>Day ${n}</b> qilib belgilandi (boshlanish sanasi ${course.fmt(sd)} deb hisoblanadi). Oʻquvchilar ilovani qayta ochganda yangilanadi.`);
  }
  if (cmd === '/sorov') return sendPoll(id, text.replace(/^\/sorov\s*/, '').trim());
  if (cmd === '/sorovnatija') return pollResult(id);
  if (cmd === '/arizalar') {
    const snap = await col('b25_next').orderBy('at', 'desc').limit(30).get();
    const lines = snap.docs.map(x => x.data()).map(x => `• ${tg.esc(x.name)} ${x.username ? '@' + x.username : ''} — ${x.lessons}/34 dars${x.test != null ? `, test ${x.test}` : ''}`);
    return tg.send(id, `📝 <b>Keyingi bosqichga arizalar</b> (${snap.size})\n${lines.join('\n') || '—'}`);
  }
  if (cmd === '/yopiqyubor') {
    // Re-send the closed-channel link to everyone who already has a code but never received a link
    // (/yopiqyubor hammaga — to every code holder, reusing stored links).
    const all = arg === 'hammaga';
    const list = (await users().get()).docs.map(x => x.data()).filter(x => x.code && (all || !x.closedLink));
    if (!list.length) return tg.send(id, all ? 'Kod olganlar yoʻq.' : '✅ Havola olmagan kod egalari yoʻq — hammaga yetib borgan.');
    if (!ENV.CLOSED && !ENV.CLOSED_LINK) return tg.send(id, '❌ CLOSED_CHANNEL_ID (yoki CLOSED_INVITE_LINK) Netlify’da yoʻq.');
    const t0 = Date.now(); let sent = 0, noLink = 0, failed = 0;
    for (const u of list) {
      if (Date.now() - t0 > 20000) break;
      const link = await closedLink(u);
      if (!link) { noLink++; continue; }
      try { await tg.send(u.id, `🔒 <b>Yopiq kanal havolangiz</b> (onlayn darslar shu yerda):\n${link}\n<i>Havola faqat siz uchun, 1 marta ishlaydi — hozir kirib qoʻying.</i>`, tg.kb(closedRow(link))); sent++; }
      catch (e) { failed++; }
    }
    const left = list.length - sent - noLink - failed;
    return tg.send(id, `🔒 Yopiq kanal havolasi yuborildi: <b>${sent}</b> ta${noLink ? `\n⚠️ havola yaratib boʻlmadi: ${noLink} (/yopiqtest)` : ''}${failed ? `\n❌ yetib bormadi (botni bloklagan): ${failed}` : ''}${left > 0 ? `\n⏳ vaqt tugadi, qolgani: ${left} — /yopiqyubor ni yana bosing` : ''}`);
  }
  if (cmd === '/yopiqtest') {
    if (!ENV.CLOSED) return tg.send(id, '❌ CLOSED_CHANNEL_ID Netlify’da yoʻq.');
    try {
      const me = await tg.call('getMe', {});
      const m = await tg.call('getChatMember', { chat_id: ENV.CLOSED, user_id: me.id });
      const link = await tg.oneTimeInvite(ENV.CLOSED, 'test');
      await tg.call('revokeChatInviteLink', { chat_id: ENV.CLOSED, invite_link: link }).catch(() => {});
      return tg.send(id, `✅ Yopiq kanal ishlayapti.\nID: <code>${ENV.CLOSED}</code>\nBot holati: ${m.status}\nSinov havolasi yaratildi va bekor qilindi.`);
    } catch (e) {
      return tg.send(id, `❌ Yopiq kanal xatosi: <code>${tg.esc(e.message)}</code>\nID: <code>${ENV.CLOSED}</code>\n\nTekshiring: 1) ID toʻgʻri (−100 bilan boshlanadi); 2) bot yopiq kanalda <b>admin</b>; 3) adminlik huquqlarida <b>«Invite users via link»</b> yoqilgan.${ENV.CLOSED_LINK ? '\nHozircha CLOSED_INVITE_LINK ishlatilmoqda.' : ''}`);
    }
  }
  if (cmd === '/eslat') {
    const r = await require('./cron-morning').run();
    return tg.send(id, r.skipped ? (r.day < 1 ? 'Kurs hali boshlanmagan (/boshlash bilan sana qoʻying).' : `Day ${r.day} allaqachon eʼlon qilingan. Keyingi kun ertaga oʻzi ochiladi.`) : `📣 Day ${r.day} eʼloni yuborildi: ${r.sent} ta, xato: ${r.failed}`);
  }
  if (cmd === '/natija') {
    const prog = await col('b25_progress').orderBy('updatedAt', 'desc').limit(40).get();
    const lines = prog.docs.map(x => { const p = x.data(); const done = Object.keys(p.units || {}).length; const sh = Object.keys(p.shadow || {}).length; return `• ${tg.esc(p.name)} @${p.username || '-'} — ${done}/34 dars, ${sh} shadowing, ${p.points || 0} ball${p.streak ? `, 🔥${p.streak}` : ''}${p.test ? `, test ${p.test.score}` : ''}`; });
    return tg.send(id, `📚 <b>Oxirgi natijalar</b>\n${lines.join('\n') || '—'}`);
  }
  return tg.send(id, 'Admin buyruqlari:\n/stat — umumiy statistika\n/natija — oʻquvchilar natijalari\n/boshlash 2026-10-27 — kurs boshlanish sanasi (Day 1). Keyin har kuni bitta kun oʻzi ochiladi\n/kun N — bugunni Day N deb belgilash\n/eslat — bugungi kun eʼlonini hozir yuborish\n/sorov [savol] — darsdan keyin 1 savollik soʻrov yuborish\n/sorovnatija — oxirgi soʻrov natijasi\n/arizalar — keyingi bosqichga yozilganlar\n/yopiqtest — yopiq kanal havolasi ishlashini tekshirish\n/yopiqyubor — kod olib, havola olmaganlarga yopiq kanal havolasini yuborish (/yopiqyubor hammaga — barcha kod egalariga)\n/kodber <user_id> — kodni majburan berish');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };
  if (ENV.SECRET && event.headers['x-telegram-bot-api-secret-token'] !== ENV.SECRET) return { statusCode: 403, body: 'forbidden' };
  let up; try { up = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'bad json' }; }
  try {
    // Someone joined one of our channels → evaluate him (auto credit, no button).
    if (up.chat_member && isOurChannel(up.chat_member.chat)) {
      const cm = up.chat_member, st = cm.new_chat_member.status, old = cm.old_chat_member.status;
      if (['member', 'administrator', 'creator', 'restricted'].includes(st) && ['left', 'kicked'].includes(old)) {
        await evaluate(cm.new_chat_member.user.id);
      }
      return { statusCode: 200, body: 'ok' };
    }
    // Bot added as admin to a channel, or someone posts /id in a channel → tell admins the chat id.
    const mc = up.my_chat_member, cp = up.channel_post;
    if ((mc && ['administrator', 'member'].includes(mc.new_chat_member.status) && mc.chat.type !== 'private') || (cp && /^\/id\b/.test(cp.text || ''))) {
      const chat = (mc || cp).chat;
      for (const a of ENV.ADMINS) await tg.send(a, `📌 Kanal: <b>${tg.esc(chat.title)}</b>\nID: <code>${chat.id}</code>\n\nYopiq kanal boʻlsa, shu raqamni Netlify’da <b>CLOSED_CHANNEL_ID</b> ga qoʻying.`).catch(() => {});
      return { statusCode: 200, body: 'ok' };
    }
    if (up.message && up.message.text) {
      const m = up.message, from = m.from, t = m.text.trim();
      if (m.chat.type !== 'private') return { statusCode: 200, body: 'ok' };
      if (t.startsWith('/start')) await onStart(from, t.split(/\s+/)[1]);
      else if (t.startsWith('/link') || t.startsWith('/havola')) await tg.send(from.id, `🔗 Sizning havolangiz:\n${refLink(from.id)}`, tg.kb([shareRow(from.id)]));
      else if (t.startsWith('/holat') || t.startsWith('/status') || t.startsWith('/tekshir')) { const u = await evaluate(from.id, { quiet: true }); await sendStatus(String(from.id), u); }
      else if (/^\/yopiq(\s|$)/.test(t)) await sendClosed(from.id);
      else if (/^\/keyingi/.test(t)) await onNext(from);
      else if (/^\/kod(\s|$)/.test(t)) { const u = await evaluate(from.id, { quiet: true }); await tg.send(from.id, u && u.code ? `🔑 Kodingiz: <code>${u.code}</code>\n📱 ${ENV.APP}/?code=${u.code}` : `Hali kod yoʻq. ${ENV.REQUIRED} ta doʻst taklif qiling: ${refLink(from.id)}`); }
      else if (ENV.ADMINS.includes(String(from.id)) && t.startsWith('/')) await onAdmin(from, t);
      else { await getUser(from.id) ? await sendStatus(String(from.id)) : await onStart(from, ''); }
    } else if (up.callback_query) {
      const cq = up.callback_query, from = cq.from;
      if (!cq.data.startsWith('poll:')) await tg.answerCb(cq.id);
      if (cq.data === 'status' || cq.data === 'check') { const u = await evaluate(from.id, { quiet: true }); await sendStatus(String(from.id), u); }
      else if (cq.data === 'closed') await sendClosed(from.id);
      else if (cq.data === 'next') await onNext(from);
      else if (cq.data.startsWith('poll:')) await onPollVote(cq);
      else if (cq.data === 'link') await tg.send(from.id, `🔗 Sizning havolangiz:\n${refLink(from.id)}`, tg.kb([shareRow(from.id)]));
    }
  } catch (e) { console.error('bot error', e); }
  return { statusCode: 200, body: 'ok' };
};
