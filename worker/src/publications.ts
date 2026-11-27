import { Client } from "pg";
import type { Bindings } from "./ingress.ts";

export function database(env: Bindings) {
  return async (sql: string, params: unknown[] = []) => {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
      connectionTimeoutMillis: 4000,
    });
    try {
      await client.connect();
      return (await client.query(sql, params)).rows;
    } finally {
      await client.end();
    }
  };
}

function objectKey(
  bot: string,
  source: string,
  version: number,
  digest: string,
) {
  return `sources/${bot}/${source}/${version}/${digest}`;
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function publishNext(env: Bindings) {
  const query = database(env);
  // Claim for one minute. A crash after either PUT can safely replay the same keys.
  const [row] = await query(`WITH pick AS (
    SELECT v.source_id,v.version,s.bot_id FROM inbox_source_versions v JOIN inbox_sources s ON s.id=v.source_id
    WHERE NOT s.withdrawn AND v.raw_bytes IS NOT NULL AND v.retry_at<=now()
    ORDER BY v.retry_at FOR UPDATE OF v SKIP LOCKED LIMIT 1
  ) UPDATE inbox_source_versions v SET retry_at=now()+interval '1 minute' FROM pick
    WHERE v.source_id=pick.source_id AND v.version=pick.version
    RETURNING pick.*,v.raw_hash,v.text_hash,v.raw_bytes,v.normalized_bytes`);
  if (!row) return;
  async function store(digest: string, bytes: Uint8Array) {
    const key = objectKey(row.bot_id, row.source_id, row.version, digest);
    const put = await env.KNOWLEDGE.put(key, bytes, {
      sha256: digest,
      onlyIf: { etagDoesNotMatch: "*" },
    });
    if (!put) {
      const head = await env.KNOWLEDGE.head(key);
      if (!head?.checksums.sha256 || hex(head.checksums.sha256) !== digest)
        throw Error("Source checksum mismatch");
    }
  }
  await store(row.raw_hash, row.raw_bytes);
  if (row.text_hash !== row.raw_hash)
    await store(row.text_hash, row.normalized_bytes);
  await query(
    `WITH activated AS (
    UPDATE inbox_sources SET active_version=$2 WHERE id=$1 AND NOT withdrawn AND active_version=$2-1 RETURNING id
  ) UPDATE inbox_source_versions v SET published_at=now(),raw_bytes=NULL,normalized_bytes=NULL
    FROM activated WHERE v.source_id=activated.id AND v.version=$2`,
    [row.source_id, row.version],
  );
}

export async function readSection(
  env: Bindings,
  bot: string,
  sectionId: string,
) {
  const [row] = await database(env)(
    `SELECT id,source_id,version,filename,text_hash,byte_start,byte_length,sha256
    FROM inbox_published_sections WHERE bot_id=$1 AND id=$2`,
    [bot, sectionId],
  );
  if (!row) return;
  const obj = await env.KNOWLEDGE.get(
    objectKey(bot, row.source_id, row.version, row.text_hash),
    {
      range: { offset: row.byte_start, length: row.byte_length },
    },
  );
  if (!obj) throw Error("Missing published source");
  const bytes = await obj.arrayBuffer();
  if (
    bytes.byteLength !== row.byte_length ||
    hex(await crypto.subtle.digest("SHA-256", bytes)) !== row.sha256
  )
    throw Error("Source passage checksum mismatch");
  return {
    id: row.id,
    title: row.filename,
    excerpt: new TextDecoder().decode(bytes),
    hash: row.sha256,
  };
}
