// This entry point is bundled only by the loopback Miniflare emulator.
import worker from "../src/index.ts";
import type { Bindings } from "../src/ingress.ts";

export default {
  ...worker,
  async fetch(
    request: Request,
    env: Bindings & { LOCAL_AUDIT_TOKEN: string; LOCAL_BOT_ID: string },
  ) {
    const { pathname } = new URL(request.url);
    const prefix = "/internal/local-r2-digest/";
    if (!pathname.startsWith(prefix)) return worker.fetch(request, env);
    if (
      request.method !== "GET" ||
      !env.LOCAL_AUDIT_TOKEN ||
      request.headers.get("authorization") !== "Bearer " + env.LOCAL_AUDIT_TOKEN
    ) {
      return new Response(null, { status: 403 });
    }
    const parts = pathname.slice(prefix.length).split("/");
    const [bot, doc, version, digest] = parts;
    if (
      parts.length !== 4 ||
      bot !== env.LOCAL_BOT_ID ||
      !/^[a-f0-9-]{36}$/.test(doc) ||
      !/^[1-9]\d*$/.test(version) ||
      !/^[a-f0-9]{64}$/.test(digest)
    ) {
      return new Response(null, { status: 400 });
    }
    const obj = await env.KNOWLEDGE.get("sources/" + parts.join("/"));
    if (!obj) return new Response(null, { status: 404 });
    const hash = new crypto.DigestStream("SHA-256");
    await obj.body.pipeTo(hash);
    const sha256 = Array.from(new Uint8Array(await hash.digest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    return Response.json(
      { sha256, size: obj.size },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
};
