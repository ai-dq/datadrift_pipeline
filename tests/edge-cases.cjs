const { selectDataset } = require("./dataset-selection.cjs");
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  const errors = [];
  const checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    const models = await (await page.request.get(base + "/api/models")).json();
    const other = models.find(
      (m) =>
        m.id !== "qwen35_2b" &&
        m.kind === "base" &&
        m.status === "ready" &&
        m.available,
    );
    assert(other, "Need another available model for selection checks");
    let scenario = "archived";
    await page.route(/\/api\/models(?:\?.*)?$/, (route) =>
      route.fulfill({
        json: models.map((m) =>
          scenario === "all_unavailable"
            ? { ...m, available: false }
            : m.id === "qwen35_2b"
              ? scenario === "archived"
                ? { ...m, status: "archived" }
                : { ...m, available: false }
              : m,
        ),
      }),
    );
    // Intercept submissions: these checks must not enqueue GPU work or edit models.
    let submitted;
    await page.route("**/api/jobs", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 422,
        json: { detail: "QA submission intercepted" },
      });
    });
    for (const mode of ["archived", "missing_files"]) {
      scenario = mode;
      for (const [path, label, button] of [
        ["training", "시작 모델", "학습 시작"],
        ["evaluation", "모델", "평가 시작"],
      ]) {
        await page.goto(`${base}/ko/${path}/qwen35_2b`);
        await page.locator(".loading").waitFor({ state: "hidden" });
        await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
          "data-model-id",
          "",
        );
        await expect(
          page.getByRole("button", { name: button, exact: true }),
        ).toBeDisabled();
        await page.getByLabel(label, { exact: true }).click();
        await page
          .locator(`[role="option"][data-model-id="${other.id}"]`)
          .click();
        await page.getByRole("button", { name: button, exact: true }).click();
        await expect(page.locator(".alert.error")).toContainText(
          "QA submission intercepted",
        );
        assert.equal(submitted.model_id, other.id);
      }
      checks.push(
        `${mode}: explicit model cannot silently substitute; selected replacement matches POST`,
      );
    }
    scenario = "archived";
    await page.goto(base + "/ko/training");
    await page.locator(".loading").waitFor({ state: "hidden" });
    const selected = await page
      .getByLabel("시작 모델")
      .getAttribute("data-model-id");
    assert.notEqual(selected, "qwen35_2b");
    await page.getByRole("button", { name: "학습 시작", exact: true }).click();
    await expect(page.locator(".alert.error")).toContainText(
      "QA submission intercepted",
    );
    assert.equal(submitted.model_id, selected);
    checks.push(
      "default selection matches submitted model when default model is archived",
    );
    scenario = "all_unavailable";
    await page.goto(base + "/ko/evaluation");
    await page.locator(".loading").waitFor({ state: "hidden" });
    await expect(
      page.getByRole("button", { name: "평가 시작", exact: true }),
    ).toBeDisabled();
    checks.push("no available models disables submission");
    await page.unroute(/\/api\/models(?:\?.*)?$/);
    await page.unroute("**/api/jobs");
    const datasets = await (
      await page.request.get(base + "/api/datasets?current=true")
    ).json();
    const mus = datasets.find((d) => d.workspace_id === "musinsa");
    await page.goto(base + "/ko/workspaces/musinsa");
    await selectDataset(page, mus.id);
    await page.locator(".sample-card").first().waitFor();
    const first = (
      await (
        await page.request.get(base + `/api/datasets/${mus.id}/samples?limit=1`)
      ).json()
    ).items[0];
    const firstImage = `/api/datasets/${mus.id}/images/${first.id}`;
    await expect(page.locator(".sample-card img").first()).toHaveAttribute(
      "src",
      firstImage,
    );
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await expect(page.locator(".pagination")).toContainText(
      `2 / ${Math.ceil(mus.count / 24)}`,
    );
    await expect(page.locator(".sample-card img").first()).not.toHaveAttribute(
      "src",
      firstImage,
    );
    await page
      .getByPlaceholder("상품 ID 또는 속성 검색")
      .fill("QA-no-match-xyz");
    await expect(
      page.getByText("검색 조건에 맞는 데이터가 없습니다."),
    ).toBeVisible();
    await expect(page.locator(".pagination")).toContainText("1 / 1");
    await page
      .getByPlaceholder("상품 ID 또는 속성 검색")
      .fill(first.product_id);
    await expect(page.locator(".sample-card img").first()).toHaveAttribute(
      "src",
      firstImage,
    );
    checks.push("pagination, empty search and matching product search");
    await page.goto(base + "/ko/reconstruction");
    await page.locator(".loading").waitFor({ state: "hidden" });
    await page.getByLabel("저장할 워크스페이스 이름").fill("QA preview only");
    for (const checkbox of await page.locator('input[type="checkbox"]').all())
      await checkbox.uncheck();
    await expect(
      page.getByRole("button", { name: "미리보기", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "워크스페이스 생성", exact: true }),
    ).toBeDisabled();
    await page
      .locator(".check-row")
      .filter({
        hasText: new RegExp(
          "^" +
            mus.name
              .replace(/\s*[·ㆍ]\s*/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
            "데이터 ",
        ),
      })
      .getByRole("checkbox")
      .check();
    const available = (mus.splits.train || 0) + (mus.splits.unassigned || 0);
    await page.getByLabel("데이터 수").fill(String(available + 1));
    await page.getByRole("button", { name: "미리보기", exact: true }).click();
    await expect(page.locator(".alert.error")).toContainText(
      `최대 ${available}개`,
    );
    await page.getByLabel("데이터 수").fill("12");
    await page.getByRole("button", { name: "미리보기", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("미리보기를 계산");
    await expect(page.locator(".alert.error")).toHaveCount(0);
    checks.push(
      "empty reconstruction inputs, excessive budget, corrected input recovery",
    );
    const missing = await page.request.get(base + "/api/datasets/not-found");
    assert.equal(missing.status(), 404);
    const completed = (
      await (await page.request.get(base + "/api/jobs")).json()
    ).find((j) => j.status === "succeeded");
    const events = await page.request.get(
      `${base}/api/jobs/${completed.id}/events`,
    );
    assert.match(events.headers()["content-type"], /text\/event-stream/);
    assert.equal(
      JSON.parse((await events.text()).trim().slice(6)).id,
      completed.id,
    );
    assert.equal(
      (
        await page.request.post(`${base}/api/jobs/${completed.id}/cancel`)
      ).status(),
      409,
    );
    checks.push(
      "404 response, completed SSE stream and completed-job cancellation rejection",
    );
    assert.equal(errors.length, 0);
    fs.writeFileSync(
      ".runtime/ui-verification/edge-cases.json",
      JSON.stringify({ checks, errors, status: "passed" }, null, 2),
    );
    console.log(JSON.stringify({ checks, errors, status: "passed" }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
