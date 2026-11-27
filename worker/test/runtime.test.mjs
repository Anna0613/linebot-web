import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import { startEmulator } from '../scripts/emulator.mjs';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('verified webhook survives a PostgreSQL outage and redelivery', { timeout: 65000 }, async t => {
  const bot = randomUUID(), owner = randomUUID(), secret = 'local-test-only', destination = 'Ulocal';
  const port = await freePort();
  const directory = await mkdtemp(join(tmpdir(), 'botlyn-pg-'));
  const password = randomBytes(12).toString('hex');
  const pg = new EmbeddedPostgres({
    databaseDir: join(directory, 'db'), port, password, autoRehydrateSymlinks: true,
    postgresFlags: ['-h', '127.0.0.1', '-k', directory], onLog() {},
  });
  await pg.initialise();
  await pg.start();
  t.after(() => pg.stop());
  const client = pg.getPgClient();
  await client.connect();
  await client.query('CREATE TABLE bots(id uuid PRIMARY KEY, is_active boolean, user_id uuid)');
  await client.query('INSERT INTO bots VALUES($1,true,$2)', [bot, owner]);
  await client.query(await readFile(new URL('../../backend/migrations/sql/20261127_inbox.sql', import.meta.url), 'utf8'));
  await client.query(await readFile(new URL('../../backend/migrations/sql/20261127_inbox_drafts.sql', import.meta.url), 'utf8'));
  await client.query(`CREATE TABLE knowledge_documents(id uuid PRIMARY KEY, bot_id uuid, title text, original_file_name text, deleted_at timestamptz);
    CREATE TABLE knowledge_chunks(id uuid PRIMARY KEY, document_id uuid, bot_id uuid, content text, deleted_at timestamptz)`);
  await client.query(await readFile(new URL('../../backend/migrations/sql/20261127_knowledge_versions.sql', import.meta.url), 'utf8'));
  await client.query(`CREATE TABLE logic_templates(id uuid PRIMARY KEY,bot_id uuid,user_id uuid,name text,logic_blocks jsonb);
    CREATE TABLE flex_messages(id uuid PRIMARY KEY,user_id uuid,name text,content jsonb)`);
  const doc = randomUUID(), chunk = randomUUID();
  await client.query("INSERT INTO knowledge_documents(id,bot_id,title) VALUES ($1,$2,'門市資訊')", [doc,bot]);
  await client.query("INSERT INTO knowledge_chunks(id,document_id,bot_id,content) VALUES ($1,$2,$3,'營業時間為週一至週五九點到六點。')", [chunk,doc,bot]);
  await client.end();
  const runtime = await startEmulator({
    databaseUrl: `postgres://postgres:${password}@127.0.0.1:${port}/postgres`, botId: bot, destination, secret, tickToken: secret
  });
  t.after(() => runtime.dispose());
  const url = new URL('/api/v1/webhooks/' + bot, await runtime.ready);
  function send(events, { target = destination, signWith = secret } = {}) {
    const body = JSON.stringify({ destination: target, events });
    const signature = createHmac('sha256', signWith).update(body).digest('base64');
    return fetch(url, { method: 'POST', body, headers: { 'x-line-signature': signature } });
  }
  assert.equal((await send([])).status, 200);
  assert.equal((await send([], { signWith: 'wrong' })).status, 401);
  assert.equal((await send([], { target: 'another-bot' })).status, 400);
  const message = { type: 'message', webhookEventId:'e1', timestamp:Date.now(),
    source:{type:'user', userId:'U1'}, message:{id:'1',type:'text',text:'營業時間'} };
  await pg.stop();
  assert.equal((await send([message])).status, 200);
  await delay(1500);
  await pg.start();
  const check = pg.getPgClient();
  await check.connect();
  try {
    let count = 0;
    for (let attempt=0; attempt<60; attempt++) {
      count = (await check.query('SELECT * FROM inbox_messages')).rows.length;
      if (count) break;
      await delay(250);
    }
    assert.equal(count, 1, 'the original queued event must survive the outage');
    assert.equal((await send([message])).status, 200);
    await delay(1600);
    assert.equal((await check.query('SELECT * FROM inbox_messages')).rows.length, 1);
    assert.equal((await check.query('SELECT * FROM inbox_jobs')).rows.length, 1);
    await check.query("UPDATE inbox_jobs SET draft_state='requested',draft_started_at=now()");
    const tick = await runtime.dispatchFetch('http://localhost/internal/local-draft-tick', {
      method:'POST', headers:{Authorization:'Bearer ' + secret}
    });
    assert.equal(tick.status, 204);
    const draft = (await check.query('SELECT * FROM inbox_jobs')).rows[0];
    assert.equal(draft.draft_chunk,chunk);
    assert.equal(draft.draft_model,'local-fixture');
    assert.equal(draft.draft_state,'ready');
    assert.deepEqual(draft.draft_tools,['knowledge.search','knowledge.read']);
    if (process.env.INBOX_TEST_PYTHON) {
      const result = await promisify(execFile)(process.env.INBOX_TEST_PYTHON, ['-m', 'pytest', '-q', '-o', 'addopts=', '--noconftest', 'tests/test_pg_inbox.py'], {
        cwd: fileURLToPath(new URL('../../backend/', import.meta.url)),
        env: { ...process.env, INBOX_TEST_URL:url.origin, INBOX_TEST_TICK:secret, INBOX_TEST_BOT: bot, INBOX_TEST_OWNER: owner,
          DB_HOST:'127.0.0.1', DB_PORT:String(port), DB_NAME:'postgres', DB_USER:'postgres', DB_PASSWORD:password,
          DB_REPLICA_HOST:'127.0.0.1', DB_REPLICA_PORT:String(port), DB_REPLICA_NAME:'postgres',
          DB_REPLICA_USER:'postgres', DB_REPLICA_PASSWORD:password },
      });
      console.log(result.stdout);
      const bucket = await runtime.getR2Bucket('KNOWLEDGE');
      const versions = await check.query('SELECT * FROM inbox_source_versions ORDER BY version');
      assert.equal(versions.rowCount,2);
      for (const v of versions.rows) {
        assert.equal(v.raw_bytes,null);
        assert.equal(v.normalized_bytes,null);
        const raw = await bucket.get(`sources/${bot}/${v.source_id}/${v.version}/${v.raw_hash}`);
        assert.equal(createHash('sha256').update(Buffer.from(await raw.arrayBuffer())).digest('hex'),v.raw_hash);
      }
      assert.equal((await check.query('SELECT state FROM inbox_jobs')).rows[0].state, 'cancelled');
    }
    // Recover from a partial publication without exposing it or overwriting a conflicting object.
    const retrySource = randomUUID();
    const rawBytes = Buffer.from('可重播的原檔');
    const normalized = Buffer.from('可重播的原檔\n');
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    await check.query('INSERT INTO inbox_sources(id,bot_id) VALUES($1,$2)',[retrySource,bot]);
    await check.query(`INSERT INTO inbox_source_versions
      (source_id,version,filename,raw_hash,text_hash,raw_bytes,normalized_bytes)
      VALUES($1,1,'retry.txt',$2,$3,$4,$5)`,[retrySource,digest(rawBytes),digest(normalized),rawBytes,normalized]);
    const bucket = await runtime.getR2Bucket('KNOWLEDGE');
    const key = `sources/${bot}/${retrySource}/1/${digest(normalized)}`;
    await bucket.put(key, 'conflicting content');
    const runTick = () => runtime.dispatchFetch('http://localhost/internal/local-draft-tick', {
      method:'POST',headers:{Authorization:'Bearer ' + secret}
    });
    assert.equal((await runTick()).status,503);
    assert.equal((await check.query('SELECT active_version FROM inbox_sources WHERE id=$1',[retrySource])).rows[0].active_version,0);
    const rawObject = await bucket.get(`sources/${bot}/${retrySource}/1/${digest(rawBytes)}`);
    assert.equal(await rawObject.text(), rawBytes.toString());
    await bucket.delete(key);
    await check.query("UPDATE inbox_source_versions SET retry_at=now() WHERE source_id=$1",[retrySource]);
    assert.equal((await runTick()).status,204);
    assert.equal((await check.query('SELECT active_version FROM inbox_sources WHERE id=$1',[retrySource])).rows[0].active_version,1);
  } finally {
    await check.end();
  }
});
