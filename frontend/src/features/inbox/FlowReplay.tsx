import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FlexMessagePreview from "@/components/preview/FlexMessagePreview";
import type { SimMessage } from "@/features/visual-editor/utils/simulateGraph";
import type { WorkflowGraph } from "@/features/visual-editor/types/workflow";

type Release = { id: string; name: string; version: number };
type Snapshot = Release & {
  graph: WorkflowGraph;
  flex: { id: string; name: string; digest: string; content: unknown }[];
};

async function load<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Cannot read release");
  return response.json();
}

export default function FlowReplay({
  base,
  cacheKeys,
  body,
  english,
}: {
  base: string;
  cacheKeys: string[];
  body: string;
  english: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const list = useQuery({
    queryKey: [...cacheKeys, "releases"],
    enabled: open,
    queryFn: ({ signal }) => load<Release[]>(base + "/releases", signal),
  });
  const snapshot = useQuery({
    queryKey: [...cacheKeys, "release", id],
    enabled: open && !!id,
    queryFn: ({ signal }) => load<Snapshot>(base + "/releases/" + id, signal),
  });
  const release = snapshot.data;
  const [steps, setSteps] = useState<SimMessage[]>([]);
  useEffect(() => {
    setSteps([]);
    if (!open || !release) return;
    // A saved regular expression can take longer than the graph's node budget.
    const worker = new Worker(new URL("./replay.worker.ts", import.meta.url), {
      type: "module",
    });
    const stop = () => {
      worker.terminate();
      setSteps([
        {
          type: "system",
          content: english
            ? "Replay could not finish."
            : "這個流程未能在時間內完成測試。",
        },
      ]);
    };
    const timeout = window.setTimeout(stop, 2000);
    worker.onmessage = (event: MessageEvent<SimMessage[]>) => {
      clearTimeout(timeout);
      setSteps(event.data);
      worker.terminate();
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      stop();
    };
    worker.postMessage({
      graph: release.graph,
      body,
      assets: release.flex.map(({ id, name }) => ({ id, name })),
    });
    return () => {
      clearTimeout(timeout);
      worker.terminate();
    };
  }, [open, release, body, english]);

  return (
    <details
      className="mt-3 text-sm"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer">
        {english ? "Test a saved flow" : "用這則訊息測試流程"}
      </summary>
      {open && (
        <div className="grid gap-2 py-2">
          {list.isSuccess && !list.data.length && (
            <p>
              {english
                ? "Create a test version in the flow editor first."
                : "請先到流程編輯器建立測試版本。"}
            </p>
          )}
          {!!list.data?.length && (
            <select
              className="max-w-full p-2"
              aria-label={english ? "Flow version" : "流程版本"}
              value={id}
              onChange={(e) => setId(e.target.value)}
            >
              <option value="">
                {english ? "Choose a flow version" : "選擇流程測試版本"}
              </option>
              {list.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · v{r.version}
                </option>
              ))}
            </select>
          )}
          {(list.isLoading || snapshot.isLoading) && (
            <p role="status">{english ? "Loading…" : "讀取中…"}</p>
          )}
          {(list.isError || snapshot.isError) && (
            <p role="alert">
              {english
                ? "Could not read the flow version."
                : "無法讀取流程版本。"}
            </p>
          )}
          {release &&
            !snapshot.isError &&
            steps.map((step, index) => {
              const asset = release.flex.find((f) => f.id === step.flexId);
              return (
                <div key={index} className="border-l-2 pl-2">
                  <span>{step.content}</span>
                  {asset && (
                    <fieldset disabled className="min-w-0">
                      <legend className="text-xs">
                        {asset.name} · {asset.digest.slice(0, 10)}
                      </legend>
                      <FlexMessagePreview
                        json={{ type: "flex", contents: asset.content }}
                      />
                    </fieldset>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </details>
  );
}
