import { createHmac, randomUUID } from 'node:crypto';

const { LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET, LOCAL_DESTINATION } = process.env;
if (![LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET, LOCAL_DESTINATION].every(Boolean)) {
  throw new Error('Set LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET and LOCAL_DESTINATION.');
}
const id = process.env.LOCAL_EVENT_ID || randomUUID();
const payload = JSON.stringify({
  destination: LOCAL_DESTINATION,
  events: [{ type: 'message', webhookEventId: id, timestamp: Date.now(),
    source: { type: 'user', userId: 'local-test-user' },
    message: { type: 'text', id, text: process.env.LOCAL_TEXT || '想確認訂單的配送時間。' } }],
});
const signature = createHmac('sha256', LOCAL_CHANNEL_SECRET).update(payload).digest('base64');
const response = await fetch('http://127.0.0.1:8787/api/v1/webhooks/' + encodeURIComponent(LOCAL_BOT_ID), {
  method: 'POST', body: payload, headers: { 'content-type': 'application/json', 'x-line-signature': signature },
});
if (!response.ok) throw new Error('Webhook returned ' + response.status);
console.log('Enqueued local event', id);
