const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    let jobs = [];
    await page.route("**/api/jobs", async (route) => {
      if (route.request().method() === "POST") {
        jobs.push(route.request().postDataJSON());
        await route.fulfill({
          status: 503,
          json: { detail: "검증용 접수 차단" },
        });
      } else await route.continue();
    });
    await page.goto(base + "/ko/training");
    await page.getByRole("button", { name: "학습 설정", exact: true }).click();
    let settings = page.getByRole("dialog", { name: "학습 설정", exact: true });
    await settings.getByLabel("학습 스텝", { exact: true }).fill("21");
    await settings.getByLabel("학습 스텝", { exact: true }).press("Enter");
    await expect(settings).not.toBeVisible();
    assert.equal(jobs.length, 0, "Enter in settings must not start training");
    await page.getByRole("button", { name: "학습 설정", exact: true }).click();
    await expect(settings.getByLabel("학습 스텝", { exact: true })).toHaveValue(
      "21",
    );
    await settings.getByLabel("학습 스텝", { exact: true }).fill("0");
    await settings.getByRole("button", { name: "적용", exact: true }).click();
    await expect(settings).toBeVisible();
    await settings.getByLabel("학습 스텝", { exact: true }).fill("99");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "학습 설정", exact: true }).click();
    await expect(settings.getByLabel("학습 스텝", { exact: true })).toHaveValue(
      "21",
    );
    await settings.getByRole("button", { name: "취소", exact: true }).click();
    await page.getByRole("button", { name: "학습 시작", exact: true }).click();
    await expect(page.locator("main [role=alert]")).toContainText(
      "검증용 접수 차단",
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].max_steps, 21);
    // Read-only navigation requests may be dismissed; late results must not reopen the editor.
    let releaseIds;
    await page.route("**/api/datasets/*/samples?*", async (route) => {
      if (new URL(route.request().url()).searchParams.get("ids_only")) {
        await new Promise((resolve) => (releaseIds = resolve));
        await route.fulfill({ json: { ids: [], total: 0 } }).catch(() => {});
      } else await route.continue();
    });
    await page.goto(base + "/ko/workspaces/gsshop");
    await page.locator(".sample-review").first().click();
    let editor = page.getByRole("dialog", { name: "레이블 상세", exact: true });
    await expect(
      editor.getByRole("button", { name: "상세 닫기", exact: true }),
    ).toBeEnabled();
    await expect.poll(() => typeof releaseIds).toBe("function");
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    releaseIds();
    releaseIds = undefined;
    await page.locator(".sample-review").first().click();
    await expect.poll(() => typeof releaseIds).toBe("function");
    await editor
      .getByRole("button", { name: "상세 닫기", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
    releaseIds();
    await page.unroute("**/api/datasets/*/samples?*");
    // Historical training data remains visible even when it is no longer the current collection.
    const models = await (
      await page.request.get(base + "/api/models?summary=true")
    ).json();
    const current = await (
      await page.request.get(base + "/api/datasets?current=true")
    ).json();
    const model = models.find(
      (m) =>
        m.kind === "lora" &&
        m.dataset_id &&
        !current.some((d) => d.id === m.dataset_id),
    );
    assert(model);
    const source = await (
      await page.request.get(base + "/api/datasets/" + model.dataset_id)
    ).json();
    const displayName = (s) =>
      s.replaceAll("·", " ").replace(/\s+/g, " ").trim();
    await page.goto(base + "/ko/models/" + model.id);
    const details = page.locator(".details").first();
    await expect(details).toContainText(displayName(source.name));
    await expect(details).not.toContainText("사전학습 모델");
    // URL state survives detail/back links, browser back, refresh, and resets after filtering.
    await page.goto(base + "/ko/models?q=Qwen&type=lora&page=2");
    let pager = page.getByRole("navigation", {
      name: "모델 목록 페이지",
      exact: true,
    });
    await expect(pager.getByRole("combobox")).toHaveValue("1");
    await expect(page.getByPlaceholder("모델 이름 검색")).toHaveValue("Qwen");
    await expect(
      page.getByRole("combobox", { name: "모델 유형", exact: true }),
    ).toHaveValue("lora");
    await page.locator(".model-name").first().click();
    await page
      .getByRole("heading", { name: "모델 상세", exact: true })
      .waitFor();
    await expect(
      page
        .locator(".sidebar")
        .getByRole("link", { name: "모델 목록", exact: true }),
    ).toHaveAttribute("href", "/ko/models?q=Qwen&type=lora&page=2");
    await page.locator("main .back").click();
    await page.waitForURL(/\/ko\/models\?/);
    await page
      .getByRole("heading", { name: "모델 목록", exact: true })
      .waitFor();
    await expect(pager.getByRole("combobox")).toHaveValue("1");
    await page.reload();
    await expect(pager.getByRole("combobox")).toHaveValue("1");
    await page.locator(".model-name").first().click();
    await page
      .getByRole("heading", { name: "모델 상세", exact: true })
      .waitFor();
    await page.locator("main .back").waitFor();
    await page.goBack();
    await page.waitForURL(/\/ko\/models\?/);
    await page
      .getByRole("heading", { name: "모델 목록", exact: true })
      .waitFor();
    await expect(pager.getByRole("combobox")).toHaveValue("1");
    await page.getByPlaceholder("모델 이름 검색").fill("Qwen3.5");
    assert(!new URL(page.url()).searchParams.has("page"));
    // Every evaluation result identifies its source image, including images beyond page one.
    await page.goto(base + "/ko/evaluation");
    const results = page.locator(".evaluation-results");
    await results.locator("summary").first().click();
    const rp = page.getByRole("navigation", {
      name: "평가 결과 페이지",
      exact: true,
    });
    await rp.getByRole("button", { name: "다음", exact: true }).click();
    await results
      .locator(".evaluation-results-list > details")
      .first()
      .locator("summary")
      .click();
    const link = results.getByRole("link", {
      name: "평가 이미지 11 크게 보기",
      exact: true,
    });
    await expect(link).toBeVisible();
    await link.scrollIntoViewIfNeeded();
    const href = await link.getAttribute("href");
    assert(
      (await page.request.get(base + href)).ok(),
      "Historical image endpoint must return image",
    );
    await expect(link.locator("img")).toHaveJSProperty(
      "naturalWidth",
      await link.locator("img").evaluate(async (image) => {
        await image.decode();
        return image.naturalWidth;
      }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    // Failed API page requests keep the committed page and its rows; retry commits both together.
    let fail = true;
    const predictions = Array.from({ length: 11 }, (_, i) => ({
      id: "test-" + i,
      status: "succeeded",
      created_at: "2026-10-29T00:00:00Z",
      result_url: "/api/predictions/review-" + i,
    }));
    await page.route(
      "**/api/model-endpoints/*/predictions?*",
      async (route) => {
        const offset = Number(
          new URL(route.request().url()).searchParams.get("offset"),
        );
        if (offset && fail)
          await route.fulfill({
            status: 503,
            json: { detail: "검증용 목록 오류" },
          });
        else
          await route.fulfill({
            json: { items: predictions.slice(offset, offset + 10), total: 11 },
          });
      },
    );
    await page.goto(base + "/ko/model-api");
    pager = page.getByRole("navigation", {
      name: "API 요청 페이지",
      exact: true,
    });
    const table = page.locator(".model-api .stable-page tbody");
    await expect(table.locator("tr")).toHaveCount(10);
    await pager.getByRole("button", { name: "다음", exact: true }).click();
    await expect(page.locator("main [role=alert]")).toContainText(
      "검증용 목록 오류",
    );
    await expect(pager.getByRole("combobox")).toHaveValue("0");
    await expect(pager).toContainText("1–10 / 11개");
    await expect(table.locator("button").first()).toHaveText("test-0");
    fail = false;
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(pager.getByRole("combobox")).toHaveValue("1");
    await expect(pager).toContainText("11–11 / 11개");
    await expect(table.locator("button").first()).toHaveText("test-10");
    await expect(page.locator("main [role=alert]")).toHaveCount(0);
    console.log(
      "Six UI review fixes passed: settings Enter/apply/cancel/validation; dismiss delayed reads; historical source; list URL state; source images; failed-page/retry consistency. Job requests mocked; no data writes.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
