import type { Client } from 'pg';
import type { Envelope } from './ingress.ts';

/** The caller owns a fresh connection. Never acknowledge the queue inside the transaction. */
export async function storeEvent(db: Pick<Client, 'query'>, event: Envelope) {
  await db.query('BEGIN');
  try {
    const receipt = await db.query(
      `INSERT INTO inbox_events(bot_id, event_id, event_type, occurred_at, received_at)
       SELECT id, $2, $3, $4, $5 FROM bots WHERE id=$1 AND is_active
       ON CONFLICT DO NOTHING RETURNING bot_id`,
      [event.botId, event.eventId, event.kind, event.occurredAt, event.receivedAt]
    );
    if (receipt.rows.length && (event.kind === 'message' || event.kind === 'unsend')) {
      await storeMessage(db, event);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

async function storeMessage(db: Pick<Client, 'query'>, event: Envelope) {
  const { rows: [thread] } = await db.query(
    `INSERT INTO inbox_conversations(bot_id, source_type, source_id, last_activity, last_seq)
     VALUES ($1,$2,$3,$4,1)
     ON CONFLICT (bot_id,source_type,source_id) DO UPDATE SET
       last_seq=inbox_conversations.last_seq+1,
       last_activity=greatest(inbox_conversations.last_activity, excluded.last_activity)
     RETURNING id, last_seq, owner_mode, ownership_epoch, last_activity <= $4 AS current_turn`,
    [event.botId, event.sourceType, event.sourceId, event.occurredAt]
  );
  const withdrawn = event.kind === 'unsend';
  // An unsend can arrive before its message. Keep the tombstone in either order.
  const result = await db.query(
    `INSERT INTO inbox_messages(conversation_id, seq, line_message_id, actor_id, kind, body, withdrawn, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (conversation_id,line_message_id) DO UPDATE SET body=NULL, withdrawn=true
       WHERE excluded.withdrawn AND NOT inbox_messages.withdrawn
     RETURNING seq`,
    [thread.id, thread.last_seq, event.messageId, event.actorId, event.messageKind ?? 'unknown',
      withdrawn ? null : event.text, withdrawn, event.occurredAt]
  );
  if (!result.rows.length) return;
  if (withdrawn) {
    await db.query("UPDATE inbox_jobs SET state='cancelled' WHERE conversation_id=$1 AND seq=$2", [thread.id, result.rows[0].seq]);
  } else if (thread.owner_mode === 'auto' && thread.current_turn) {
    await db.query("UPDATE inbox_jobs SET state='cancelled' WHERE conversation_id=$1 AND state='pending'", [thread.id]);
    if (event.messageKind !== 'text') return;
    await db.query('INSERT INTO inbox_jobs(conversation_id,seq,ownership_epoch) VALUES ($1,$2,$3)',
      [thread.id, thread.last_seq, thread.ownership_epoch]);
  }
}
