const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const datasets = await (
      await page.request.get(base + "/api/datasets?current=true")
    ).json();
    const target = datasets.find((d) => d.count > 0);
    assert(target);
    let savedBody;
    // Backend transaction is tested separately against a temporary database.
    await page.route("**/api/reconstructions", async (route) => {
      savedBody = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: target });
    });
    await page.goto(base + "/ko/reconstruction");
    await expect(
      page.getByRole("combobox", { name: "선별 방식", exact: true }),
    ).toHaveValue("balanced_mix");
    await page
      .getByLabel("저장할 워크스페이스 이름", { exact: true })
      .fill("새 재구성 워크스페이스");
    await expect(
      page.locator("select").filter({
        has: page.locator('option[value="' + target.workspace_id + '"]'),
      }),
    ).toHaveCount(0);
    await page.getByLabel("데이터 수").fill("2");
    await page
      .getByRole("button", { name: "워크스페이스 생성", exact: true })
      .click();
    await expect(page).toHaveURL(
      base + "/ko/workspaces/" + target.workspace_id,
    );
    assert.equal(savedBody.name, "새 재구성 워크스페이스");
    assert.equal(savedBody.workspace_id, undefined);
    assert.equal(savedBody.data_count, 2);
    assert.equal(savedBody.method, "balanced_mix");
    assert.equal(
      Object.values(savedBody.dataset_weights).reduce((n, w) => n + w, 0),
      100,
    );
    assert(savedBody.dataset_ids.length);
    await expect(page.locator(".dataset-current")).toHaveAttribute(
      "data-dataset-id",
      target.id,
    );
    await expect(page.locator(".topbar")).toHaveCount(0);
    console.log(
      "Reconstruction UI passed: one name, new-workspace payload, navigation after save, no topbar. Save response mocked; no production data created.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
