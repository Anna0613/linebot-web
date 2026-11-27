import { Client } from 'pg';
import { ingress, type Bindings, type Envelope } from './ingress.ts';
import { storeEvent } from './store.ts';

import { processDraft } from './drafts.ts';

export default {
  async scheduled(_event: ScheduledController, env: Bindings) { await processDraft(env); },
  async fetch(request: Request, env: Bindings) {
    try {
      if (env.LOCAL_TICK_TOKEN && request.method === 'POST' &&
          new URL(request.url).pathname === '/internal/local-draft-tick' &&
          request.headers.get('authorization') === 'Bearer ' + env.LOCAL_TICK_TOKEN) {
        await processDraft(env);
        return new Response(null, {status: 204});
      }
      return await ingress(request, env);
    } catch {
      // Retryable binding failure. Neither raw messages nor signatures belong in logs.
      return new Response(null, { status: 503 });
    }
  },
  async queue(batch: MessageBatch<Envelope>, env: Bindings) {
    const db = new Client({ connectionString: env.HYPERDRIVE.connectionString, connectionTimeoutMillis: 4000 });
    try {
      await db.connect();
      for (const message of batch.messages) {
        await storeEvent(db, message.body);
        message.ack();
      }
    } finally {
      await db.end();
    }
  },
} satisfies ExportedHandler<Bindings, Envelope>;
