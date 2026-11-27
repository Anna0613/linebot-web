import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { API_CONFIG } from "@/config/apiConfig";

type Source = {
  id: string;
  active_version: number;
  version: number;
  filename: string;
};
type Upload = { id: string; base: number; file: File };

async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.detail === "string" ? error.detail : "無法連線，請稍後再試"
    );
  }
  return response.json();
}

export default function PublishedSources({
  botId,
  documents,
}: {
  botId: string;
  documents: {
    id: string;
    title?: string | null;
    original_file_name?: string | null;
  }[];
}) {
  const url =
    API_CONFIG.UNIFIED.BASE_URL +
    "/bots/" +
    encodeURIComponent(botId) +
    "/inbox/sources";
  const list = useQuery<Source[]>({
    queryKey: ["published-sources", botId],
    queryFn: () => request(url),
    refetchInterval: 4000,
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const [legacyId, setLegacyId] = useState("");
  const [target, setTarget] = useState<Source>();
  const [upload, setUpload] = useState<Upload>();
  const [withdraw, setWithdraw] = useState<Source>();
  const [notice, setNotice] = useState("");
  const action = useMutation({
    mutationFn: async (change: Upload | Source) => {
      if ("file" in change) {
        const data = new FormData();
        data.append("file", change.file);
        data.append("base_version", String(change.base));
        return request(url + "/" + change.id, { method: "PUT", body: data });
      }
      return request(url + "/" + change.id + "?version=" + change.version, {
        method: "DELETE",
      });
    },
    onSuccess: (_result, change) => {
      setNotice(
        "file" in change ? "已排入發布，完成後即可引用。" : "已撤回來源。"
      );
      setUpload(undefined);
      setLegacyId("");
      setTarget(undefined);
      setWithdraw(undefined);
      if (fileInput.current) fileInput.current.value = "";
      void list.refetch();
    },
    onError: () => {
      void list.refetch();
    },
  });
  function choose(source?: Source) {
    setTarget(source);
    setUpload(undefined);
    setWithdraw(undefined);
    setNotice("");
    action.reset();
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  }
  return (
    <section
      className="studio-documents p-4"
      aria-labelledby="published-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="published-heading" className="font-semibold">
          收件匣草稿來源
        </h2>
        <Button
          type="button"
          size="sm"
          disabled={action.isPending}
          onClick={() =>
            choose(
              legacyId
                ? { id: legacyId, version: 0, active_version: 0, filename: "" }
                : undefined
            )
          }
        >
          新增來源
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        上傳 TXT、Markdown、PDF 或 DOCX，每份最多 5
        MiB。升級既有文件後，收件匣將引用新版本。
      </p>
      {documents.length > 0 && (
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          發布對象
          <select
            value={legacyId}
            onChange={(e) => setLegacyId(e.target.value)}
            disabled={action.isPending}
          >
            <option value="">新增獨立來源</option>
            {documents
              .filter((doc) => !list.data?.some((s) => s.id === doc.id))
              .map((doc) => (
                <option key={doc.id} value={doc.id}>
                  升級 · {doc.title || doc.original_file_name || "未命名文件"}
                </option>
              ))}
          </select>
        </label>
      )}
      <input
        type="file"
        ref={fileInput}
        hidden
        accept=".txt,.md,.pdf,.docx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            setUpload({
              id: target?.id ?? crypto.randomUUID(),
              base: target?.version ?? 0,
              file,
            });
        }}
      />
      {list.isPending && <p role="status">載入來源中…</p>}
      {list.isError && (
        <p role="alert">
          無法讀取來源。{" "}
          <button type="button" onClick={() => void list.refetch()}>
            重新整理
          </button>
        </p>
      )}
      {list.data?.map((source) => (
        <div
          key={source.id}
          className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <strong className="break-all">{source.filename}</strong>
            <p>
              {source.active_version
                ? `可引用 v${source.active_version}`
                : "尚無可引用版本"}
              {source.active_version !== source.version &&
                ` · v${source.version} 等待發布`}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={
              action.isPending || source.active_version !== source.version
            }
            onClick={() => choose(source)}
          >
            更新版本
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={action.isPending}
            onClick={() => {
              setWithdraw(source);
              setUpload(undefined);
              setNotice("");
              action.reset();
            }}
          >
            撤回
          </Button>
        </div>
      ))}
      {(upload || withdraw) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
          <span>
            {upload
              ? `發布 ${upload.file.name} 為 v${upload.base + 1}？`
              : `撤回「${withdraw?.filename}」後，其草稿引用會失效。`}
          </span>
          <Button
            size="sm"
            disabled={action.isPending}
            onClick={() => {
              const change = upload ?? withdraw;
              if (change) action.mutate(change);
            }}
          >
            {upload ? "確認發布" : "確認撤回"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={action.isPending}
            onClick={() => {
              setUpload(undefined);
              setWithdraw(undefined);
              action.reset();
            }}
          >
            取消
          </Button>
        </div>
      )}
      {notice && (
        <p className="mt-2 text-sm" role="status">
          {notice}
        </p>
      )}
      {action.isError && (
        <p className="mt-2 text-sm" role="alert">
          {action.error.message}
        </p>
      )}
    </section>
  );
}
