import { Client } from 'pg';
import { ingress, type Bindings, type Envelope } from './ingress.ts';
import { storeEvent } from './store.ts';

import { deliverCampaign, deliverReply } from "./delivery.ts";
import { processDraft } from './drafts.ts';

import { publishNext } from './publications.ts';

async function tick(env: Bindings) {
  if (env.LINE_DELIVERY_MODE === "live" || env.LINE_DELIVERY_MODE === "simulate") {
    await deliverReply(env);
    await deliverCampaign(env);
  }
  try { await publishNext(env); }
  finally { await processDraft(env); }
}

export default {
  async scheduled(_event: ScheduledController, env: Bindings) { await tick(env); },
  async fetch(request: Request, env: Bindings) {
    try {
      if (env.LOCAL_TICK_TOKEN && request.method === 'POST' &&
          new URL(request.url).pathname === '/internal/local-draft-tick' &&
          request.headers.get('authorization') === 'Bearer ' + env.LOCAL_TICK_TOKEN) {
        await tick(env);
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
