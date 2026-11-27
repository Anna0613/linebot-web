import { startEmulator } from './emulator.mjs';

const { LOCAL_DATABASE_URL, LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET, LOCAL_DESTINATION } = process.env;
if (![LOCAL_DATABASE_URL, LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET, LOCAL_DESTINATION].every(Boolean)) {
  throw new Error('Set LOCAL_DATABASE_URL, LOCAL_BOT_ID, LOCAL_CHANNEL_SECRET and LOCAL_DESTINATION for an isolated test bot.');
}
const runtime = await startEmulator({
  databaseUrl: LOCAL_DATABASE_URL, botId: LOCAL_BOT_ID.toLowerCase(),
  secret: LOCAL_CHANNEL_SECRET, destination: LOCAL_DESTINATION, port: 8787,
});
console.log('Local webhook:', new URL('/api/v1/webhooks/' + LOCAL_BOT_ID, await runtime.ready).href);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => runtime.dispose());
