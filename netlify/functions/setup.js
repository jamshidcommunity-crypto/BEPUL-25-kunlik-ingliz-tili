// One-click webhook setup: open  <APP_URL>/.netlify/functions/setup?key=<WEBHOOK_SECRET>
// Registers the webhook WITH chat_member updates (needed for automatic join detection) and the bot's command menu.
const tg = require('./lib/tg');

exports.handler = async (event) => {
  const key = (event.queryStringParameters || {}).key || '';
  const secret = process.env.WEBHOOK_SECRET || '';
  const html = (body) => ({ statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="font:16px system-ui;padding:24px;max-width:640px;margin:auto">${body}</body>` });
  if (!secret || key !== secret) return html('<h2>❌ Kalit notoʻgʻri</h2><p>Manzil oxiriga <code>?key=WEBHOOK_SECRET</code> qiymatini qoʻying (Netlify’dagi bilan bir xil).</p>');
  const base = (process.env.APP_URL || `https://${event.headers.host}`).replace(/\/$/, '');
  try {
    await tg.call('setWebhook', {
      url: `${base}/.netlify/functions/bot`, secret_token: secret, max_connections: 40,
      allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'channel_post'],
    });
    await tg.call('setMyCommands', { commands: [
      { command: 'start', description: 'Boshlash' },
      { command: 'holat', description: 'Holatim va taklif qilganlarim' },
      { command: 'havola', description: 'Mening taklif havolam' },
      { command: 'kod', description: 'Ilovaga kirish kodim' },
    ] });
    const info = await tg.call('getWebhookInfo', {});
    const me = await tg.call('getMe', {});
    const checks = [];
    for (const ch of [process.env.CHANNEL_1, process.env.CHANNEL_2, process.env.CLOSED_CHANNEL_ID].filter(Boolean)) {
      try { const m = await tg.call('getChatMember', { chat_id: ch, user_id: me.id }); checks.push(`<li>${ch}: ${m.status === 'administrator' ? '✅ bot admin' : '⚠️ bot admin emas (' + m.status + ')'}</li>`); }
      catch (e) { checks.push(`<li>${ch}: ⚠️ ${e.message}</li>`); }
    }
    return html(`<h2>✅ Bot ulandi</h2><p>@${me.username} → <code>${info.url}</code></p><p>Kuzatiladigan hodisalar: ${(info.allowed_updates || []).join(', ')}</p><h3>Kanallar</h3><ul>${checks.join('')}</ul>${info.last_error_message ? `<p>Oxirgi xato: ${info.last_error_message}</p>` : ''}<p>Endi botga /start yozib tekshiring.</p>`);
  } catch (e) {
    return html(`<h2>❌ Xato</h2><p>${e.message}</p><p>BOT_TOKEN toʻgʻriligini tekshiring.</p>`);
  }
};
