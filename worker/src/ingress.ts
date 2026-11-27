export interface Envelope {
  botId: string;
  eventId: string;
  kind: string;
  occurredAt: string;
  receivedAt: string;
  sourceType: 'user' | 'room' | 'group' | null;
  sourceId: string | null;
  actorId: string | null;
  messageId: string | null;
  messageKind: string | null;
  text: string | null;
}

export interface Bindings {
  INBOUND: Queue<Envelope>;
  CHANNELS: R2Bucket;
  KNOWLEDGE: R2Bucket;
  CHANNEL_KEY: string;
  LOCAL_DRAFT_FIXTURE?: string;
  LINE_DELIVERY_MODE?: "simulate" | "live";
  LOCAL_TICK_TOKEN?: string;
  AI?: {run(model: string, input: unknown, options?: { signal: AbortSignal }): Promise<{response: string}>};
  HYPERDRIVE: Hyperdrive;
}

const utf8 = new TextEncoder();
const bytes = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

async function loadChannel(env: Bindings, botId: string) {
  const object = await env.CHANNELS.get(`channels/${botId}`);
  if (!object) return null;
  const encrypted = await object.json<{ iv: string; ciphertext: string }>();
  const key = await crypto.subtle.importKey('raw', bytes(env.CHANNEL_KEY), 'AES-GCM', false, ['decrypt']);
  const data = await crypto.subtle.decrypt({
    name: 'AES-GCM', iv: bytes(encrypted.iv), additionalData: utf8.encode(botId)
  }, key, bytes(encrypted.ciphertext));
  return JSON.parse(new TextDecoder().decode(data)) as {
    enabled: boolean; secret: string; destination: string;
  };
}

// Project only the fields consumed by the shadow inbox. Attachments remain LINE IDs.
// Flex/postback execution and reply tokens belong to the later dispatcher cutover.
function normalize(raw: Record<string, any>, botId: string, receivedAt: string): Envelope {
  const source = raw.source ?? {};
  const sourceType = ['user', 'room', 'group'].includes(source.type) ? source.type : null;
  const sourceId = sourceType ? source[sourceType + 'Id'] : null;
  if (!raw.webhookEventId || typeof raw.webhookEventId !== 'string' ||
      !Number.isSafeInteger(raw.timestamp) || typeof raw.type !== 'string') {
    throw new Error('invalid event');
  }
  const messageId = raw.message?.id ?? raw.unsend?.messageId;
  if (['message', 'unsend'].includes(raw.type) &&
      (!sourceType || typeof sourceId !== 'string' || !sourceId || typeof messageId !== 'string' || !messageId)) {
    throw new Error('invalid message');
  }
  return {
    botId, eventId: raw.webhookEventId, kind: raw.type,
    occurredAt: new Date(raw.timestamp).toISOString(), receivedAt,
    sourceType, sourceId: sourceId ?? null, actorId: source.userId ?? null,
    messageId: messageId ?? null, messageKind: raw.message?.type ?? null,
    text: typeof raw.message?.text === 'string' ? raw.message.text : null,
  };
}

export async function ingress(request: Request, env: Bindings): Promise<Response> {
  const match = new URL(request.url).pathname.match(/^\/api\/v1\/webhooks\/([\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12})$/i);
  if (!match) return new Response(null, { status: 404 });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const encoded = request.headers.get('x-line-signature');
  if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) return new Response(null, { status: 401 });
  const botId = match[1].toLowerCase();
  const channel = await loadChannel(env, botId);
  if (!channel?.enabled) return new Response(null, { status: 404 });
  const body = await request.arrayBuffer();
  const key = await crypto.subtle.importKey('raw', utf8.encode(channel.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('HMAC', key, bytes(encoded), body))) return new Response(null, { status: 401 });

  let events: Envelope[];
  try {
    const payload = JSON.parse(new TextDecoder().decode(body));
    if (payload.destination !== channel.destination || !Array.isArray(payload.events)) throw new Error();
    const receivedAt = new Date().toISOString();
    events = payload.events.map((event: Record<string, unknown>) => normalize(event, botId, receivedAt));
  } catch {
    return new Response(null, { status: 400 });
  }
  // A LINE text is bounded; send each normalized event separately so a whole batch
  // cannot exceed the queue's per-message limit. PG deduplicates partial retries.
  for (const event of events) await env.INBOUND.send(event);
  return new Response(null, { status: 200 });
}
