// Minimal Telegram Bot API client (fetch-based, Node 18+).
const TOKEN = process.env.BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

async function call(method, payload) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload || {})
  });
  const j = await r.json();
  if (!j.ok) { const e = new Error(`${method}: ${j.description}`); e.code = j.error_code; throw e; }
  return j.result;
}
const send = (chat_id, text, extra) => call('sendMessage', { chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
const answerCb = (id, text) => call('answerCallbackQuery', { callback_query_id: id, text: text || '', show_alert: !!text }).catch(() => {});

// Is the user a member of a channel? Bot must be an admin of that channel.
async function isMember(chat, userId) {
  try {
    const m = await call('getChatMember', { chat_id: chat, user_id: userId });
    return ['creator', 'administrator', 'member', 'restricted'].includes(m.status);
  } catch (e) {
    if (e.code === 400) return false; // user not found in chat
    throw e;
  }
}
// One-person invite link to the closed channel (bot must be admin with "invite users" right).
async function oneTimeInvite(chat, name) {
  const link = await call('createChatInviteLink', { chat_id: chat, member_limit: 1, name: String(name || '').slice(0, 32) });
  return link.invite_link;
}
const kb = (rows) => ({ reply_markup: { inline_keyboard: rows } });
const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

module.exports = { call, send, answerCb, isMember, oneTimeInvite, kb, esc };
