import { Client } from 'pg';
import { ingress, type Bindings, type Envelope } from './ingress.ts';
import { storeEvent } from './store.ts';

export default {
  async fetch(request: Request, env: Bindings) {
    try {
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
