import { expect, test } from "@playwright/test";

test("an operator sees the same reply in the inbox and the friend's chat", async ({ page, baseURL }) => {
  const bot = { id: "11111111-1111-4111-8111-222222222222", name: "測試頻道", is_active: true };
  const user = { id: "operator", username: "operator", email: "operator@example.test" };
  const thread = { id: "33333333-3333-4333-8333-333333333333", source_id: "U1", source_type: "user",
    owner_mode: "auto", ownership_epoch: 0, last_activity: new Date().toISOString(), kind: "text", body: "營業時間" };
  const messages = [{ seq: 1, kind: "text", body: thread.body, occurred_at: thread.last_activity, delivery_state: null as string | null }];
  let broadcasts = 0;
  let feedback = 0;
  await page.addInitScript(id => {
    localStorage.setItem("botlyn-selected-bot-id", id);
    localStorage.setItem("botlyn-language", "zh");
  }, bot.id);
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return url.origin === baseURL ? route.continue() : route.abort();
    const path = url.pathname;
    let result: unknown = [];
    if (path.endsWith("check-login")) result = { authenticated: true, user };
    else if (path.endsWith("/profile")) result = user;
    else if (/\/bots\/?$/.test(path)) result = [bot];
    else if (path.endsWith("/" + bot.id)) result = bot;
    else if (path.endsWith("/users")) result = { users: [{id:"U1",line_user_id:"U1",display_name:"測試好友"}], total_count:1 };
    else if (path.endsWith("/inbox")) result = { items:[thread], has_more:false };
    else if (path.endsWith("/thread")) result = thread;
    else if (path.endsWith("/messages") && path.includes("/inbox/")) result = { thread, items:messages, has_more:false };
    else if (path.endsWith("/takeover")) { thread.owner_mode = "human"; thread.ownership_epoch = 1; result = thread; }
    else if (path.endsWith("/broadcast/selective")) {
      const data = route.request().postDataJSON();
      expect(data.user_ids).toEqual(["U1"]);
      expect(data.client_key).toMatch(/^[\da-f-]{36}$/);
      broadcasts++;
      result = {success:true, state:"queued"};
    }
    else if (path.includes("/users/feedback/")) {
      expect(route.request().method()).toBe("PUT");
      expect(route.request().postDataJSON()).toMatchObject({category:"功能建議",message:"顯示等候時間"});
      feedback++;
      result = {id:path.split("/").pop()};
    }
    else if (path.endsWith("/replies")) {
      const data = route.request().postDataJSON();
      expect(data.ownership_epoch).toBe(1);
      expect(data.client_key).toMatch(/^[\da-f-]{36}$/);
      messages.push({ ...messages[0], seq:2, body:data.body, delivery_state:"simulated" });
      result = { seq:2, state:"queued" };
    }
    await route.fulfill({ json:result, headers:{ "access-control-allow-origin":baseURL!, "access-control-allow-credentials":"true" } });
  });
  await page.goto("/bots/inbox");
  await page.getByRole("button", {name:"接手對話"}).click();
  await page.getByLabel("輸入客服回覆").fill("您好，門市十點營業。");
  await page.getByRole("button", {name:"送出回覆"}).click();
  await expect(page.getByText("本機模擬送出")).toBeVisible();
  await page.goto("/bots/user-management");
  await page.getByText("測試好友", {exact:true}).first().click();
  await expect(page.getByText("您好，門市十點營業。", {exact:true})).toBeVisible();
  await expect(page.getByText("本機模擬送出")).toBeVisible();
  await page.getByRole("button", {name:"全選"}).click();
  await page.getByRole("button", {name:"廣播 (1)"}).click();
  await page.getByPlaceholder("輸入要廣播的訊息...").fill("門市公告");
  await page.getByRole("button", {name:"發送", exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(broadcasts).toBe(1);

  await page.goto("/suggest");
  await page.getByRole("button", {name:"功能建議"}).click();
  await page.getByLabel("意見內容").fill("顯示等候時間");
  await page.getByRole("button", {name:"送出意見"}).click();
  await expect(page.getByText("已收到你的意見。")).toBeVisible();
  expect(feedback).toBe(1);
});
