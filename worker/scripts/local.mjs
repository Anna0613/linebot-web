import { startEmulator } from './emulator.mjs';

const { LOCAL_DATABASE_URL, LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET, LOCAL_DESTINATION } = process.env;
if (![LOCAL_DATABASE_URL, LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET, LOCAL_DESTINATION].every(Boolean)) {
  throw new Error('Set LOCAL_DATABASE_URL, LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET and LOCAL_DESTINATION for an isolated test bot.');
}
const tickToken = crypto.randomUUID();
const runtime = await startEmulator({
  databaseUrl: LOCAL_DATABASE_URL, botId: LOCAL_BOT_ID.toLowerCase(),
  secret: LOCAL_CHANNEL_SECRET, destination: LOCAL_DESTINATION, port: 8787, tickToken, r2Persist: process.env.LOCAL_R2_DIR || '.local-r2',
});
console.log('Local webhook:', new URL('/api/v1/webhooks/' + LOCAL_BOT_ID, await runtime.ready).href);
let busy = false;
const timer = setInterval(async () => {
  if (busy) return;
  busy = true;
  try {
    const response = await runtime.dispatchFetch('http://localhost/internal/local-draft-tick', {
      method:'POST', headers:{Authorization:'Bearer ' + tickToken},
    });
    if (!response.ok) console.warn('Draft worker unavailable:', response.status);
  } catch { console.warn('Draft worker unavailable'); }
  finally { busy = false; }
}, 3000);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { clearInterval(timer); void runtime.dispose(); });
