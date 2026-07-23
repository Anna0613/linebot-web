import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description: string;
  canonicalPath: string;
}

const SITE_URL = "https://botlyn.net";
const DEFAULT_TITLE = "Botlyn | LINE 客服機器人與 AI 對話流程建構平台";
const DEFAULT_DESCRIPTION =
  "Botlyn 是一個視覺化的 LINE 客服機器人建構平台。把訊息積木拖一拖，串起來，結合 AI 知識庫，就能在 LINE、Web 與各種通訊管道上跑起來，不用寫一行程式碼。";

function setMeta(selector: string, attr: string, content: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, content);
}

export function useSEO({ title, description, canonicalPath }: SEOOptions) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;

    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", canonicalUrl);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', "content", DEFAULT_DESCRIPTION);
      setMeta('link[rel="canonical"]', "href", `${SITE_URL}/`);
      setMeta('meta[property="og:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', "content", DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:url"]', "content", `${SITE_URL}/`);
      setMeta('meta[name="twitter:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', "content", DEFAULT_DESCRIPTION);
    };
  }, [title, description, canonicalPath]);
}
