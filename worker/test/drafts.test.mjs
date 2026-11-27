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
