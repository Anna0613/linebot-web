import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Hand, Inbox, LoaderCircle, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { API_CONFIG } from "@/config/apiConfig";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import "./inbox.css";

type Thread = {
  id: string; source_id: string; source_type: "user" | "group" | "room";
  ownership_epoch: number; owner_mode: "auto" | "human";
};
type Content = { kind: string; body: string | null; withdrawn: boolean };
type Summary = Thread & Content & { last_activity: string };
type Message = Content & { seq: number; occurred_at: string };
const copy = {
  zh: {
    title: "客服收件匣", pilot: "試行工作區", note: "接手會取消新收件流程的待辦。此工作區尚未啟用 LINE 外送。",
    threads: "對話", empty: "目前沒有對話", choose: "選擇對話以查看訊息", error: "目前無法同步", retry: "重新整理",
    human: "人工接手中", auto: "自動模式", claim: "接手對話", older: "更早的訊息", more: "更多對話", removed: "訊息已收回",
    user: "個人", group: "群組", room: "聊天室", noBot: "請先選擇或建立頻道", dashboard: "回工作台", loading: "載入中",
  },
  en: {
    title: "Support inbox", pilot: "Pilot workspace", note: "Taking over cancels pending work in this inbox. LINE delivery is not enabled here.",
    threads: "Conversations", empty: "No conversations yet", choose: "Select a conversation to read its messages", error: "Sync unavailable", retry: "Refresh",
    human: "Human support", auto: "Automatic", claim: "Take over", older: "Earlier messages", more: "More conversations", removed: "Message withdrawn",
    user: "Direct", group: "Group", room: "Room", noBot: "Select or create a channel", dashboard: "Dashboard", loading: "Loading",
  },
};
type Labels = typeof copy.zh;

async function read<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function ThreadView({ base, keys, thread, labels }: { base: string; keys: string[]; thread: Summary; labels: Labels }) {
  const cache = useQueryClient();
  const details = useInfiniteQuery({
    queryKey: [...keys, thread.id], initialPageParam: 0, refetchInterval: 5000, retry: false,
    queryFn: ({ pageParam, signal }) => read<{ thread: Thread; items: Message[]; has_more: boolean }>(
      base + "/" + thread.id + "/messages" + (pageParam ? "?before=" + pageParam : ""), { signal }),
    getNextPageParam: page => page.has_more ? page.items[0]?.seq : undefined,
  });
  const current = details.data?.pages[0]?.thread ?? thread;
  const claim = useMutation({
    mutationFn: () => read(base + "/" + thread.id + "/takeover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownership_epoch: current.ownership_epoch }),
    }),
    onSettled: () => cache.invalidateQueries({ queryKey: keys }),
  });
  const items = details.data?.pages.slice().reverse().flatMap(page => page.items) ?? [];
  return <section className="inbox-detail">
    <header><div><small>{labels[current.source_type]}</small><h2>{current.source_id}</h2></div>
      {current.owner_mode === "human" ? <span className="inbox-tag human">{labels.human}</span> :
        <button disabled={claim.isPending || !details.isSuccess || details.isError} onClick={() => claim.mutate()}><Hand size={16}/>{labels.claim}</button>}
    </header>
    {(details.isError || claim.isError) && <p role="alert">{labels.error} <button onClick={() => void details.refetch()}>{labels.retry}</button></p>}
    <div className="inbox-timeline">
      {details.isLoading && <p role="status">{labels.loading}</p>}
      {details.hasNextPage && <button disabled={details.isFetchingNextPage} onClick={() => void details.fetchNextPage()}>{labels.older}</button>}
      {items.map(item => <article key={item.seq}>
        <time dateTime={item.occurred_at}>{new Date(item.occurred_at).toLocaleString()}</time>
        <p>{item.withdrawn ? labels.removed : item.body ?? item.kind}</p>
      </article>)}
    </div>
  </section>;
}

function ChannelInbox({ bot, account, labels }: { bot: string; account: string; labels: Labels }) {
  const [selected, select] = useState<string>();
  const base = API_CONFIG.UNIFIED.BASE_URL + "/bots/" + encodeURIComponent(bot) + "/inbox";
  const keys = ["inbox", account, bot];
  const list = useInfiniteQuery({
    queryKey: [...keys, "threads"], initialPageParam: 0, refetchInterval: 5000, retry: false,
    queryFn: ({ pageParam, signal }) => read<{ items: Summary[]; has_more: boolean }>(base + "?offset=" + pageParam, { signal }),
    getNextPageParam: (last, pages) => last.has_more ? pages.reduce((count, page) => count + page.items.length, 0) : undefined,
  });
  const all = list.data?.pages.flatMap(page => page.items) ?? [];
  const rows = Array.from(new Map(all.map(row => [row.id, row])).values());
  const current = rows.find(row => row.id === selected) ?? rows[0];
  return <div className="inbox-grid"><section className="inbox-list"><header><h2>{labels.threads}</h2>
    <button aria-label={labels.retry} onClick={() => void list.refetch()}><RotateCw size={16}/></button></header>
    {list.isLoading && <p role="status"><LoaderCircle size={16}/> {labels.loading}</p>}
    {list.isError && <p role="alert">{labels.error}</p>}
    {list.isSuccess && !rows.length && <p>{labels.empty}</p>}
    {rows.map(row => <button className="inbox-row" key={row.id} aria-pressed={current?.id === row.id} onClick={() => select(row.id)}>
      <span>{labels[row.source_type]} · {row.source_id}</span>
      <small>{row.withdrawn ? labels.removed : row.body ?? row.kind}</small>
      <em>{row.owner_mode === "human" ? labels.human : labels.auto}</em>
    </button>)}
    {list.hasNextPage && <button disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}><ArrowDown size={14}/>{labels.more}</button>}
  </section>{current ? <ThreadView key={current.id} base={base} keys={keys} thread={current} labels={labels}/> :
    <div className="inbox-empty"><Inbox size={32}/><p>{labels.choose}</p></div>}</div>;
}

export default function InboxPage() {
  const { user, loading } = useUnifiedAuth({ requireAuth: true, redirectTo: "/login" });
  const { selectedBot, hasLoaded, error, refreshBots } = useSelectedBot();
  const { language } = useLanguagePreference();
  const labels = copy[language];
  return <AppShell activeNav="inbox" user={user} headerKicker={labels.pilot} welcomeLabel={labels.title}>
    <div className="inbox-workspace"><p className="inbox-note">{labels.note}</p>
      {loading || !user || !hasLoaded ? <p role="status">{labels.loading}</p> : error ?
        <p role="alert">{labels.error} <button onClick={() => void refreshBots()}>{labels.retry}</button></p> : selectedBot ?
        <ChannelInbox key={selectedBot.id} bot={selectedBot.id} account={user.id?.toString() ?? user.username} labels={labels}/> :
        <p>{labels.noBot} · <Link to="/dashboard">{labels.dashboard}</Link></p>}
    </div>
  </AppShell>;
}
