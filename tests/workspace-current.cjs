const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    const datasets = await (
      await page.request.get(base + "/api/datasets?current=true")
    ).json();
    const original = datasets.find((d) => d.workspace_id === "gsshop");
    const next = { ...original, id: "test-new-collection" };
    const samples = await (
      await page.request.get(`${base}/api/datasets/${original.id}/samples`)
    ).json();
    let arrived = false,
      observed = 0;
    await page.route("**/api/datasets?current=true", (route) => {
      if (arrived) observed++;
      return route.fulfill({
        json: arrived
          ? datasets.map((d) => (d.id === original.id ? next : d))
          : datasets,
      });
    });
    await page.route("**/api/datasets/test-new-collection/samples?*", (route) =>
      route.fulfill({ json: samples }),
    );
    await page.route("**/api/datasets/test-new-collection/images/*", (route) =>
      route.continue({
        url: route.request().url().replace("test-new-collection", original.id),
      }),
    );
    await page.goto(base + "/ko/workspaces/gsshop");
    await expect(page.getByLabel("데이터셋 버전")).toHaveCount(0);
    await page
      .getByRole("button", { name: "레이블 검토", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "레이블 상세" });
    const fit = dialog.getByLabel("핏", { exact: true });
    await expect(fit).toBeEnabled();
    const options = await fit
      .locator("option")
      .evaluateAll((items) => items.map((o) => o.value));
    const changed = options.find((v) => v !== samples.items[0].target.fit);
    await fit.selectOption(changed);
    arrived = true;
    await expect.poll(() => observed, { timeout: 10000 }).toBeGreaterThan(0);
    await expect(fit).toHaveValue(changed);
    await expect(page.locator(".dataset-current")).toHaveAttribute(
      "data-dataset-id",
      original.id,
    );
    await dialog
      .getByRole("button", { name: "상세 닫기", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "수정 버리기", exact: true })
      .click();
    await expect(page.locator(".dataset-current")).toHaveAttribute(
      "data-dataset-id",
      next.id,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: incoming collection update preserves unsaved label edits; closing displays current data without version selection",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
