import type { Bindings } from "./ingress.ts";
import { database } from "./publications.ts";

export async function sendText(token: string, to: string | string[] | null, body: string, key: string, send = fetch) {
  const method = to === null ? "broadcast" : Array.isArray(to) ? "multicast" : "push";
  let response: Response;
  try {
    response = await send("https://api.line.me/v2/bot/message/" + method, {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "X-Line-Retry-Key": key },
      body: JSON.stringify({ ...(to === null ? {} : { to }), messages: [{ type: "text", text: body }] }),
    });
  } catch {
    // A lost acknowledgement can still represent an accepted push. Reuse its key.
    return "queued";
  }
  if (response.ok || (response.status === 409 && response.headers.has("x-line-accepted-request-id"))) return "accepted";
  if (response.status === 408 || response.status === 429 || response.status >= 500) return "queued";
  return "failed";
}

async function dispatch(env: Bindings, expired: boolean, eligible: boolean, token: string,
                        to: string | string[] | null, body: string, key: string) {
  if (expired) return "unknown";
  if (!eligible) return "failed";
  if (env.LINE_DELIVERY_MODE === "simulate") return "simulated";
  return sendText(token, to, body, key);
}

export async function deliverReply(env: Bindings) {
  const query = database(env);
  const [reply] = await query(`WITH candidate AS (
    SELECT m.conversation_id,m.seq,c.source_id,b.channel_token,b.is_active,c.owner_mode
    FROM inbox_messages m JOIN inbox_conversations c ON c.id=m.conversation_id JOIN bots b ON b.id=c.bot_id
    WHERE m.delivery_state='queued' AND m.campaign_id IS NULL AND m.dispatch_after<=now() AND NOT EXISTS (
      SELECT 1 FROM inbox_messages earlier WHERE earlier.conversation_id=m.conversation_id
      AND earlier.seq<m.seq AND earlier.delivery_state='queued')
    ORDER BY m.dispatch_after FOR UPDATE OF m SKIP LOCKED LIMIT 1)
    UPDATE inbox_messages m SET dispatch_after=now()+interval '1 minute' FROM candidate c
    WHERE m.conversation_id=c.conversation_id AND m.seq=c.seq
    RETURNING c.*,m.body,m.dispatch_key,(m.occurred_at < now()-interval '23 hours') AS expired`);
  if (!reply) return;
  const state = await dispatch(env, reply.expired, reply.is_active && reply.owner_mode === "human",
    reply.channel_token, reply.source_id, reply.body, reply.dispatch_key);
  if (state !== "queued") await query(
    "UPDATE inbox_messages SET delivery_state=$2 WHERE dispatch_key=$1 AND delivery_state='queued'",
    [reply.dispatch_key, state],
  );
}

export async function deliverCampaign(env: Bindings) {
  const query = database(env);
  const [campaign] = await query(`WITH candidate AS (
    SELECT p.id, b.is_active, b.channel_token FROM inbox_campaigns p JOIN bots b ON b.id=p.bot_id
    WHERE p.delivery_state='queued' AND p.dispatch_after<=now() AND NOT EXISTS (
      SELECT 1 FROM inbox_messages m JOIN inbox_messages earlier
      ON earlier.conversation_id=m.conversation_id AND earlier.seq<m.seq
      WHERE m.campaign_id=p.id AND earlier.delivery_state='queued')
    ORDER BY p.dispatch_after FOR UPDATE OF p SKIP LOCKED LIMIT 1)
    UPDATE inbox_campaigns p SET dispatch_after=now()+interval '1 minute' FROM candidate c
    WHERE p.id=c.id RETURNING p.id,p.recipients,p.body,c.channel_token,c.is_active,
    (p.created_at < now()-interval '23 hours') AS expired`);
  if (!campaign) return;
  const state = await dispatch(env, campaign.expired, campaign.is_active,
    campaign.channel_token, campaign.recipients, campaign.body, campaign.id);
  if (state !== "queued") await query(`WITH completed AS (
    UPDATE inbox_campaigns SET delivery_state=$2 WHERE id=$1 AND delivery_state='queued' RETURNING id)
    UPDATE inbox_messages SET delivery_state=$2 FROM completed WHERE campaign_id=completed.id`, [campaign.id, state]);
}
