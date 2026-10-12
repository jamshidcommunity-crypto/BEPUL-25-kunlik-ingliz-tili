// Telegram webhook for @InglizTili0danBot — referral gate for the Beginner 25 course.
// Flow: friend opens the referrer's link (t.me/<bot>?start=ref_<id>) → presses Start → joins BOTH channels.
// The bot sees the joins itself (chat_member updates; bot must be admin in both channels) — no button needed.
// When a referrer has REQUIRED (3) friends in both channels (and is in both channels himself), the bot sends
// an app access code + a one-time link to the closed channel.
const { col, now, inc } = require('./lib/db');
const tg = require('./lib/tg');

const ENV = {
  BOT: process.env.BOT_USERNAME || 'InglizTili0danBot',
  CH1: process.env.CHANNEL_1 || '@jamshid_akhatkulov_en',
  CH2: process.env.CHANNEL_2 || '@Imamov_academy',
  CLOSED: process.env.CLOSED_CHANNEL_ID, // e.g. -1001234567890
  APP: process.env.APP_URL || 'https://beginner25.netlify.app',
  REQUIRED: parseInt(process.env.REQUIRED_INVITES || '3', 10),
  ADMINS: (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  SECRET: process.env.WEBHOOK_SECRET || '',
};
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
  let link = null;
  if (ENV.CLOSED) { try { link = await tg.oneTimeInvite(ENV.CLOSED, u.name); } catch (e) { console.error('invite', e.message); } }
  await tg.send(uid,
    `🎉 <b>Tabriklaymiz!</b> ${ENV.REQUIRED} ta doʻstingiz qoʻshildi.\n\n` +
    `🔑 Ilovaga kirish kodingiz: <code>${code}</code>\n` +
    `📱 Ilova: ${ENV.APP}/?code=${code}\n   Havolani <b>Chrome</b> (Android/kompyuter) yoki <b>Safari</b> (iPhone) da oching va «Oʻrnatish» ni bosing — ilova telefoningizga oʻrnatiladi.\n\n` +
    (link ? `🔒 Yopiq kanal (darslar shu yerda): ${link}\n   <i>Havola faqat siz uchun, 1 marta ishlaydi.</i>` : `🔒 Yopiq kanal havolasi tez orada yuboriladi.`),
    tg.kb([[{ text: '📱 Ilovani ochish', url: `${ENV.APP}/?code=${code}` }], ...(link ? [[{ text: '🔒 Yopiq kanalga kirish', url: link }]] : [])]));
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
    const done = d ? Object.values(d.units || {}).filter(x => x.score >= 14).length : 0;
    txt += `\n\n🔑 Kod: <code>${u.code}</code>\n📱 Ilova: ${ENV.APP}/?code=${u.code}\n📚 Tugallangan darslar: <b>${done}/34</b>${d && d.test ? ` · Test: ${d.test.score}/40` : ''}`;
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
    return tg.send(id, `👥 Foydalanuvchilar: <b>${d.length}</b>\n✅ Ikkala kanalga aʼzo: <b>${joined}</b>\n🔑 Kod olganlar: <b>${coded}</b>\n📱 Ilovada ishlayotganlar: <b>${prog.size}</b>\n\n<b>Eng faol taklifchilar:</b>\n${top || '—'}`);
  }
  if (cmd === '/kodber' && arg) { await issueCode(String(arg).replace('@', '')); return tg.send(id, `Kod yuborildi: ${arg}`); }
  if (cmd === '/kun' && arg) {
    const n = parseInt(arg, 10);
    await col('b25_config').doc('main').set({ openDay: n, updatedAt: now() }, { merge: true });
    return tg.send(id, `Ilovada ochiq kun: <b>${n}</b> (oʻquvchilar ilovani qayta ochganda yangilanadi).`);
  }
  if (cmd === '/eslat') {
    const r = await require('./cron-morning').run();
    return tg.send(id, r.skipped ? `Day ${r.day} allaqachon eʼlon qilingan. Avval /kun ${r.day + 1} qiling.` : `📣 Day ${r.day} eʼloni yuborildi: ${r.sent} ta, xato: ${r.failed}`);
  }
  if (cmd === '/natija') {
    const prog = await col('b25_progress').orderBy('updatedAt', 'desc').limit(40).get();
    const lines = prog.docs.map(x => { const p = x.data(); const done = Object.values(p.units || {}).filter(u => u.score >= 14).length; const sh = Object.keys(p.shadow || {}).length; return `• ${tg.esc(p.name)} @${p.username || '-'} — ${done}/34 dars, ${sh} shadowing, ${p.points || 0} ball${p.streak ? `, 🔥${p.streak}` : ''}${p.test ? `, test ${p.test.score}` : ''}`; });
    return tg.send(id, `📚 <b>Oxirgi natijalar</b>\n${lines.join('\n') || '—'}`);
  }
  return tg.send(id, 'Admin buyruqlari:\n/stat — umumiy statistika\n/natija — oʻquvchilar natijalari\n/kun N — ilovada N-kungacha ochish (ertasi 08:00 da hammaga eʼlon ketadi)\n/eslat — yangi kun eʼlonini hozir yuborish\n/kodber <user_id> — kodni majburan berish');
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
      else if (t.startsWith('/kod')) { const u = await evaluate(from.id, { quiet: true }); await tg.send(from.id, u && u.code ? `🔑 Kodingiz: <code>${u.code}</code>\n📱 ${ENV.APP}/?code=${u.code}` : `Hali kod yoʻq. ${ENV.REQUIRED} ta doʻst taklif qiling: ${refLink(from.id)}`); }
      else if (ENV.ADMINS.includes(String(from.id)) && t.startsWith('/')) await onAdmin(from, t);
      else { await getUser(from.id) ? await sendStatus(String(from.id)) : await onStart(from, ''); }
    } else if (up.callback_query) {
      const cq = up.callback_query, from = cq.from;
      await tg.answerCb(cq.id);
      if (cq.data === 'status' || cq.data === 'check') { const u = await evaluate(from.id, { quiet: true }); await sendStatus(String(from.id), u); }
      else if (cq.data === 'link') await tg.send(from.id, `🔗 Sizning havolangiz:\n${refLink(from.id)}`, tg.kb([shareRow(from.id)]));
    }
  } catch (e) { console.error('bot error', e); }
  return { statusCode: 200, body: 'ok' };
};
