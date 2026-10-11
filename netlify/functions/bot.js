// Telegram webhook for @InglizTili0danBot — referral gate for the Beginner 25 course.
// Flow: /start (with ?start=ref_<id>) → user joins BOTH channels → presses "Tekshirish" →
// counted for the referrer → when a referrer reaches REQUIRED (3) confirmed friends, the bot sends
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
const chUrl = (ch) => `https://t.me/${String(ch).replace('@', '')}`;
const refLink = (id) => `https://t.me/${ENV.BOT}?start=ref_${id}`;
const shareUrl = (id) => `https://t.me/share/url?url=${encodeURIComponent(refLink(id))}&text=${encodeURIComponent('Ingliz tilini 0 dan bepul oʻrganamiz — 25 kunlik kurs, Imamov Academy. Shu havola orqali kiring:')}`;
const users = () => col('b25_users');

function genCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return 'B25-' + s;
}
const mainKb = () => tg.kb([
  [{ text: '✅ Kanallarga aʼzo boʻldim — tekshirish', callback_data: 'check' }],
  [{ text: '🔗 Mening havolam', callback_data: 'link' }, { text: '📊 Holatim', callback_data: 'status' }],
]);
const joinKb = (missing) => tg.kb([
  ...missing.map(ch => [{ text: `➕ ${ch} ga aʼzo boʻlish`, url: chUrl(ch) }]),
  [{ text: '✅ Aʼzo boʻldim — tekshirish', callback_data: 'check' }],
]);

async function getUser(id) { const d = await users().doc(String(id)).get(); return d.exists ? d.data() : null; }

async function onStart(from, payload) {
  const id = String(from.id);
  const u = await getUser(id);
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  if (!u) {
    const m = /^ref_(\d+)$/.exec(payload || '');
    const ref = m && m[1] !== id && (await getUser(m[1])) ? m[1] : null;
    await users().doc(id).set({ id, name, username: from.username || '', ref, joined: false, invites: 0, code: null, createdAt: now() });
    if (ref) await tg.send(ref, `👋 <b>${tg.esc(name)}</b> sizning havolangiz orqali kirdi. U ikkala kanalga aʼzo boʻlgach, hisobingizga qoʻshiladi.`).catch(() => {});
  } else if (u.name !== name || u.username !== (from.username || '')) {
    await users().doc(id).set({ name, username: from.username || '' }, { merge: true });
  }
  await tg.send(id,
    `Assalomu alaykum, <b>${tg.esc(from.first_name)}</b>! 👋\n\n` +
    `Bu — <b>Beginner 25</b>: ingliz tilini 0 dan oʻrganish uchun 25 kunlik <b>bepul</b> kurs (Imamov Academy).\n\n` +
    `Kursga kirish uchun 2 ta qadam:\n` +
    `1️⃣ Ikkala kanalga aʼzo boʻling:\n   • ${ENV.CH1}\n   • ${ENV.CH2}\n` +
    `2️⃣ <b>${ENV.REQUIRED} ta doʻstingizni</b> oʻz havolangiz orqali taklif qiling — ular ham ikkala kanalga aʼzo boʻlsin.\n\n` +
    `Shundan keyin bot sizga <b>ilovaga kirish kodini</b> va <b>yopiq kanal havolasini</b> beradi. 🎁`,
    mainKb());
}

async function checkMembership(id) {
  const [a, b] = await Promise.all([tg.isMember(ENV.CH1, id), tg.isMember(ENV.CH2, id)]);
  const missing = [];
  if (!a) missing.push(ENV.CH1);
  if (!b) missing.push(ENV.CH2);
  return missing;
}

async function issueCode(uid) {
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
    `📱 Ilova: ${ENV.APP}\n   (ochib, kodni kiriting; telefonga ilova sifatida oʻrnatish mumkin)\n\n` +
    (link ? `🔒 Yopiq kanal (darslar shu yerda): ${link}\n   <i>Havola faqat siz uchun, 1 marta ishlaydi.</i>` : `🔒 Yopiq kanal havolasi tez orada yuboriladi.`),
    tg.kb([[{ text: '📱 Ilovani ochish', url: ENV.APP }], ...(link ? [[{ text: '🔒 Yopiq kanalga kirish', url: link }]] : [])]));
}

async function onCheck(from, cbId) {
  const id = String(from.id);
  let u = await getUser(id);
  if (!u) { await onStart(from, ''); u = await getUser(id); }
  let missing;
  try { missing = await checkMembership(id); }
  catch (e) { console.error(e); await tg.answerCb(cbId); return tg.send(id, '⚠️ Tekshirishda xatolik. Bot kanallarda admin ekanini tekshiring yoki keyinroq urinib koʻring.'); }
  if (missing.length) {
    await tg.answerCb(cbId, 'Hali hamma kanalga aʼzo emassiz');
    return tg.send(id, `Hali aʼzo boʻlmagan kanal${missing.length > 1 ? 'lar' : ''}:\n${missing.map(c => '• ' + c).join('\n')}\n\nAʼzo boʻlib, yana «tekshirish»ni bosing.`, joinKb(missing));
  }
  await tg.answerCb(cbId, 'Ikkala kanalga aʼzosiz ✅');
  if (!u.joined) {
    await users().doc(id).set({ joined: true, joinedAt: now() }, { merge: true });
    if (u.ref) {
      await users().doc(u.ref).set({ invites: inc(1) }, { merge: true });
      const r = await getUser(u.ref);
      const n = r.invites || 0;
      await tg.send(u.ref, `✅ <b>${tg.esc(u.name)}</b> ikkala kanalga aʼzo boʻldi. Taklif qilganlaringiz: <b>${n}/${ENV.REQUIRED}</b>`).catch(() => {});
      if (n >= ENV.REQUIRED && !r.code) await issueCode(u.ref);
    }
  }
  u = await getUser(id);
  if (u.code) return sendStatus(id, u);
  return tg.send(id,
    `✅ Siz ikkala kanalga aʼzosiz!\n\nEndi <b>${ENV.REQUIRED} ta doʻstingizni</b> taklif qiling. Sizning havolangiz:\n${refLink(id)}\n\nHozir: <b>${u.invites || 0}/${ENV.REQUIRED}</b>`,
    tg.kb([[{ text: '📤 Doʻstlarga ulashish', url: shareUrl(id) }], [{ text: '📊 Holatim', callback_data: 'status' }]]));
}

async function sendStatus(id, u) {
  u = u || await getUser(id);
  if (!u) return tg.send(id, 'Avval /start ni bosing.');
  const n = u.invites || 0;
  const inv = await users().where('ref', '==', String(id)).get();
  const names = inv.docs.map(d => d.data()).map(x => `• ${tg.esc(x.name)} ${x.joined ? '✅' : '⏳ (kanallarga aʼzo emas)'}`).join('\n');
  let txt = `📊 <b>Holatingiz</b>\nKanallar: ${u.joined ? 'aʼzo ✅' : 'tekshirilmagan ⏳'}\nTaklif qilganlar: <b>${n}/${ENV.REQUIRED}</b>\n${names || '• hali hech kim yoʻq'}\n\n🔗 Havolangiz: ${refLink(id)}`;
  if (u.code) {
    const p = await col('b25_progress').doc(String(id)).get();
    const d = p.exists ? p.data() : null;
    const done = d ? Object.values(d.units || {}).filter(x => x.score >= 14).length : 0;
    txt += `\n\n🔑 Kod: <code>${u.code}</code>\n📱 Ilova: ${ENV.APP}\n📚 Tugallangan darslar: <b>${done}/34</b>${d && d.test ? ` · Test: ${d.test.score}/40` : ''}`;
  }
  return tg.send(id, txt, tg.kb([[{ text: '📤 Doʻstlarga ulashish', url: shareUrl(id) }], [{ text: '✅ Tekshirish', callback_data: 'check' }]]));
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
  if (cmd === '/natija') {
    const prog = await col('b25_progress').orderBy('updatedAt', 'desc').limit(40).get();
    const lines = prog.docs.map(x => { const p = x.data(); const done = Object.values(p.units || {}).filter(u => u.score >= 14).length; const sh = Object.keys(p.shadow || {}).length; return `• ${tg.esc(p.name)} @${p.username || '-'} — ${done}/34 dars, ${sh} shadowing${p.test ? `, test ${p.test.score}` : ''}`; });
    return tg.send(id, `📚 <b>Oxirgi natijalar</b>\n${lines.join('\n') || '—'}`);
  }
  return tg.send(id, 'Admin buyruqlari:\n/stat — umumiy statistika\n/natija — oʻquvchilar natijalari\n/kun N — ilovada N-kungacha ochish\n/kodber <user_id> — kodni majburan berish');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };
  if (ENV.SECRET && event.headers['x-telegram-bot-api-secret-token'] !== ENV.SECRET) return { statusCode: 403, body: 'forbidden' };
  let up; try { up = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'bad json' }; }
  try {
    if (up.message && up.message.text) {
      const m = up.message, from = m.from, t = m.text.trim();
      if (m.chat.type !== 'private') return { statusCode: 200, body: 'ok' };
      if (t.startsWith('/start')) await onStart(from, t.split(/\s+/)[1]);
      else if (t.startsWith('/link') || t.startsWith('/havola')) await tg.send(from.id, `🔗 Sizning havolangiz:\n${refLink(from.id)}`, tg.kb([[{ text: '📤 Doʻstlarga ulashish', url: shareUrl(from.id) }]]));
      else if (t.startsWith('/holat') || t.startsWith('/status')) await sendStatus(String(from.id));
      else if (t.startsWith('/kod')) { const u = await getUser(from.id); await tg.send(from.id, u && u.code ? `🔑 Kodingiz: <code>${u.code}</code>\n📱 ${ENV.APP}` : `Hali kod yoʻq. ${ENV.REQUIRED} ta doʻst taklif qiling: ${refLink(from.id)}`); }
      else if (t.startsWith('/tekshir')) await onCheck(from, null);
      else if (ENV.ADMINS.includes(String(from.id)) && t.startsWith('/')) await onAdmin(from, t);
      else await tg.send(from.id, 'Buyruqlar: /start, /tekshir, /havola, /holat, /kod', mainKb());
    } else if (up.callback_query) {
      const cq = up.callback_query, from = cq.from;
      if (cq.data === 'check') await onCheck(from, cq.id);
      else if (cq.data === 'link') { await tg.answerCb(cq.id); await tg.send(from.id, `🔗 Sizning havolangiz:\n${refLink(from.id)}\n\nDoʻstingiz shu havola orqali botga kirib, ikkala kanalga aʼzo boʻlishi kerak.`, tg.kb([[{ text: '📤 Doʻstlarga ulashish', url: shareUrl(from.id) }]])); }
      else if (cq.data === 'status') { await tg.answerCb(cq.id); await sendStatus(String(from.id)); }
      else await tg.answerCb(cq.id);
    }
  } catch (e) { console.error('bot error', e); }
  return { statusCode: 200, body: 'ok' };
};
