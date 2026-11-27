import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('private requests bypass the service worker and its old caches are removed', async () => {
  const handlers = {};
  const removed = [];
  const origin = 'https://workspace.example';
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { location: {origin}, addEventListener: (type, handler) => { handlers[type] = handler; }, clients: {claim() {}} },
    caches: {keys: async () => ['botcraft-dynamic-v2','botcraft-static-v1','other-app'], delete: async key => removed.push(key)},
    URL,
  });
  let activated;
  handlers.activate({waitUntil: promise => { activated = promise; }});
  await activated;
  assert.deepEqual(removed, ['botcraft-dynamic-v2','botcraft-static-v1']);
  for (const path of ['/api/v1/users/profile', '/api/v1/bots/one/inbox', '/api/v1/private.png', '/dashboard', '/reset-password?token=x']) {
    handlers.fetch({request: new Request(origin + path), respondWith: () => assert.fail('intercepted ' + path)});
  }
});

test('only public bundle responses can be reused offline', async () => {
  const handlers = {};
  const entries = new Map();
  const origin = 'https://workspace.example';
  let response = new Response('body{}', {headers:{'Content-Type':'text/css'}});
  const cache = {
    match: async request => entries.get(request.url)?.clone(),
    put: async (request, value) => entries.set(request.url, value),
  };
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: {location:{origin}, addEventListener: (type, fn) => { handlers[type] = fn; }},
    URL, caches:{open:async () => cache}, fetch: async (_request, options) => {
      assert.equal(options.credentials, 'omit');
      if (!response) throw new Error('offline');
      return response.clone();
    },
  });
  function request(path, headers) {
    let result;
    handlers.fetch({request:new Request(origin + path, {headers}), respondWith: promise => { result = promise; }});
    return result;
  }
  const bundle = '/assets/index-abcd1234.css';
  assert.equal(await (await request(bundle)).text(), 'body{}');
  response = null;
  assert.equal(await (await request(bundle)).text(), 'body{}');
  for (const account of ['alice', 'bob']) {
    assert.equal(request('/api/v1/users/profile', {Cookie:'session=' + account}), undefined);
    assert.equal(request(bundle, {Authorization:'Bearer ' + account}), undefined);
  }
  response = new Response('private', {headers:{'Content-Type':'text/css','Cache-Control':'private, no-store'}});
  await request('/assets/one-abcd1234.css');
  response = new Response('<html>login</html>', {headers:{'Content-Type':'text/html'}});
  await request('/assets/two-abcd1234.css');
  assert.deepEqual([...entries.keys()], [origin + bundle]);
});
