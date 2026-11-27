import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { storeEvent } from '../src/store.ts';

const botId = '00000000-0000-4000-8000-000000000001';
const message = {
  botId, eventId: 'event1', kind: 'message', occurredAt: '2026-11-27T00:00:00Z',
  receivedAt: '2026-11-27T00:00:01Z', sourceType: 'user', sourceId: 'alice',
  actorId: 'alice', messageId: 'm1', messageKind: 'text', text: '請問營業時間？',
};

test('replays, late events, withdrawal tombstones and human ownership', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('CREATE TABLE bots (id uuid PRIMARY KEY, is_active boolean)');
  await db.query('INSERT INTO bots VALUES ($1,true)', [botId]);
  await db.exec(await readFile(new URL('../../backend/migrations/sql/20261127_inbox.sql', import.meta.url), 'utf8'));
  await storeEvent(db, message);
  await storeEvent(db, message);
  assert.equal((await db.query('SELECT * FROM inbox_messages')).rows.length, 1);
  await storeEvent(db, { ...message, eventId: 'old', messageId: 'old', occurredAt: '2025-01-01T00:00:00Z' });
  assert.equal((await db.query('SELECT * FROM inbox_jobs')).rows.length, 1);
  await storeEvent(db, { ...message, eventId: 'u', kind: 'unsend' });
  assert.deepEqual((await db.query('SELECT body,withdrawn FROM inbox_messages WHERE seq=1')).rows[0], { body: null, withdrawn: true });
  assert.equal((await db.query('SELECT state FROM inbox_jobs')).rows[0].state, 'cancelled');
  await storeEvent(db, { ...message, eventId: 'u2', messageId:'m2', kind:'unsend' });
  await storeEvent(db, { ...message, eventId: 'e2', messageId:'m2' });
  assert.equal((await db.query("SELECT body FROM inbox_messages WHERE line_message_id='m2'")).rows[0].body,null);
  await db.exec("UPDATE inbox_conversations SET owner_mode='human', ownership_epoch=1");
  await storeEvent(db, { ...message, eventId:'e3', messageId:'m3' });
  assert.equal((await db.query("SELECT * FROM inbox_jobs WHERE state='pending'")).rows.length, 0);
});
