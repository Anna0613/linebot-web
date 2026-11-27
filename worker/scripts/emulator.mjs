import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { randomBytes, createCipheriv } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function startEmulator({ databaseUrl, botId, destination, secret, port = 0, tickToken, auditToken, r2Persist }) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname)) {
    throw new Error('Local development requires a loopback PostgreSQL address.');
  }
  const { outputFiles, metafile } = await build({
    entryPoints: [fileURLToPath(new URL('./local-entry.ts', import.meta.url))],
    bundle: true, metafile: true, write: false, platform: 'node', format: 'esm', conditions: ['workerd'],
    external: ['cloudflare:sockets', 'pg-native'],
  });
  // pg includes CommonJS requires of runtime builtins. Expose only those modules
  // as static imports so workerd can resolve the bundled ESM entry point.
  const modules = Object.values(metafile.outputs)[0].imports
    .filter(item => item.kind === 'require-call' && item.path !== 'pg-native')
    .map(item => item.path);
  const builtins = [...new Set(modules)];
  const imports = builtins.map((id, i) => `import * as mod${i} from ${JSON.stringify(id.includes(':') ? id : 'node:' + id)};`).join('\n');
  const entries = builtins.map((id, i) => `${JSON.stringify(id)}: mod${i}.default ?? mod${i}`);
  const bridge = `${imports}\nconst builtins={${entries}}; const require = id => { if (id in builtins) return builtins[id]; throw Error('Unavailable: '+id); };\n`;
  const key = randomBytes(32);
  const runtime = new Miniflare({
    modules: true, script: bridge + outputFiles[0].text, host: '127.0.0.1', port,
    compatibilityDate: '2026-05-04', compatibilityFlags: ['nodejs_compat'],
    hyperdrives: { HYPERDRIVE: databaseUrl },
    r2Persist, r2Buckets: ['CHANNELS', 'KNOWLEDGE'], bindings: { LOCAL_BOT_ID: botId, LOCAL_AUDIT_TOKEN: auditToken ?? '', CHANNEL_KEY: key.toString('base64'), LOCAL_DRAFT_FIXTURE:'1', LOCAL_TICK_TOKEN:tickToken ?? '' },
    queueProducers: { INBOUND: 'line-inbound' },
    queueConsumers: { 'line-inbound': { maxBatchSize: 10, maxBatchTimeout: 1, retryDelay: 2, maxRetries: 8, deadLetterQueue: 'line-inbound-dead' } },
  });
  try {
    const bucket = await runtime.getR2Bucket('CHANNELS');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(botId));
    const data = JSON.stringify({ enabled: true, destination, secret });
    const ciphertext = Buffer.concat([cipher.update(data, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    await bucket.put('channels/' + botId, JSON.stringify({ iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64') }));
    return runtime;
  } catch (e) {
    await runtime.dispose();
    throw e;
  }
}
