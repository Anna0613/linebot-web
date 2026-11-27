import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDraft } from '../src/drafts.ts';

test('agent requires a searched and readable passage before proposing a draft', async () => {
  for (const step of [{tool:'reply',value:'unverified'}, {tool:'read',value:'other-tenant-id'}]) {
    const result = await generateDraft('hello', async () => step, assert.fail, assert.fail);
    assert.equal(result.state,'handoff');
    assert.equal(result.text,null);
  }
});
test('agent stops after its bounded search budget', async () => {
  let calls = 0;
  const result = await generateDraft('配送', async () => {calls++;return {tool:'search',value:'配送'};}, async () => [], assert.fail);
  assert.equal(result.state,'handoff');
  assert.equal(calls,4);
});

test('LINE push retries use the same key and only accept a confirmed duplicate', async () => {
  const { sendText } = await import('../src/delivery.ts');
  const key = crypto.randomUUID();
  assert.equal(await sendText('test', 'U1', 'message', key, async () => { throw new TypeError('network'); }), 'queued');
  for (const [to, method] of [[null, 'broadcast'], [['U1'], 'multicast'], ['U1', 'push']]) {
    await sendText('test', to, 'message', key, async (url, init) => {
      assert.equal(url, 'https://api.line.me/v2/bot/message/' + method);
      assert.deepEqual(JSON.parse(init.body).to, to ?? undefined);
      return new Response(null, {status: 200});
    });
  }
  for (const [code, headers, outcome] of [
    [200, {}, 'accepted'], [409, {'x-line-accepted-request-id':'original'}, 'accepted'],
    [409, {}, 'failed'], [503, {}, 'queued'], [408, {}, 'queued'], [429, {}, 'queued'], [400, {}, 'failed'],
  ]) {
    assert.equal(await sendText('test', 'U1', '客服回覆', key, async (_url, init) => {
      assert.equal(init.headers['X-Line-Retry-Key'], key);
      assert.equal(JSON.parse(init.body).to, 'U1');
      return new Response(null, {status:code, headers});
    }), outcome);
  }
});
