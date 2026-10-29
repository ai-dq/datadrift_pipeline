const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const workspaces = await (
      await page.request.get(base + "/api/workspaces")
    ).json();
    const datasets = await (
      await page.request.get(base + "/api/datasets?current=true")
    ).json();
    const original = datasets.find((d) => d.workspace_id === "gsshop");
    let rows = (
      await (
        await page.request.get(
          base + `/api/datasets/${original.id}/samples?limit=30`,
        )
      ).json()
    ).items;
    rows = rows.map((r) => ({ ...r, split: "train", human_verified: false }));
    let revision = 0,
      submitted,
      deleted,
      failMove = true;
    const summary = () => ({
      ...original,
      id: revision ? "mock-split-" + revision : original.id,
      count: rows.length,
      splits: Object.fromEntries(
        ["train", "validation", "test"].map((s) => [
          s,
          rows.filter((r) => r.split === s).length,
        ]),
      ),
    });
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname;
      if (path === "/api/workspaces")
        return route.fulfill({
          json: workspaces.map((w) =>
            w.id === original.workspace_id
              ? { ...w, datasets: [summary()] }
              : w,
          ),
        });
      if (path === "/api/datasets")
        return route.fulfill({
          json: datasets.map((d) => (d.id === original.id ? summary() : d)),
        });
      if (path.match(/\/samples\/split$/)) {
        submitted = req.postDataJSON();
        if (failMove)
          return route.fulfill({
            status: 409,
            json: { detail: "검증용 충돌" },
          });
        rows = rows.map((r) =>
          submitted.sample_ids.includes(r.id)
            ? { ...r, split: submitted.split }
            : r,
        );
        revision++;
        return route.fulfill({
          json: {
            dataset: summary(),
            changed_count: submitted.sample_ids.length,
          },
        });
      }
      const labels = path.match(/\/samples\/([^/]+)\/labels$/);
      if (labels) {
        submitted = req.postDataJSON();
        rows = rows.map((r) =>
          r.id === decodeURIComponent(labels[1]) ? { ...r, ...submitted } : r,
        );
        revision++;
        return route.fulfill({
          status: 201,
          json: {
            dataset: summary(),
            sample: rows.find((r) => r.id === decodeURIComponent(labels[1])),
          },
        });
      }
      if (path.endsWith("/samples")) {
        let filtered = rows.filter(
          (r) =>
            !url.searchParams.get("split") ||
            r.split === url.searchParams.get("split"),
        );
        if (url.searchParams.get("ids_only"))
          return route.fulfill({
            json: { total: filtered.length, ids: filtered.map((r) => r.id) },
          });
        const offset = Number(url.searchParams.get("offset") || 0),
          limit = Number(url.searchParams.get("limit") || 24);
        return route.fulfill({
          json: {
            total: filtered.length,
            items: filtered.slice(offset, offset + limit),
          },
        });
      }
      const sample = path.match(/\/samples\/([^/]+)$/);
      if (sample)
        return route.fulfill({
          json: rows.find((r) => r.id === decodeURIComponent(sample[1])),
        });
      if (path.includes("/images/") && path.includes("mock-split-"))
        return route.continue({
          url: base + path.replace(/mock-split-\d+/, original.id),
        });
      if (path === "/api/deletions/preview") {
        deleted = req.postDataJSON();
        return route.fulfill({
          json: {
            ...deleted,
            token: "mock-token",
            name: original.name,
            sample_count: deleted.sample_ids.length,
            remaining_count: rows.length - deleted.sample_ids.length,
          },
        });
      }
      if (path === "/api/deletions" && req.method() === "POST") {
        deleted = req.postDataJSON();
        rows = rows.filter((r) => !deleted.sample_ids.includes(r.id));
        revision++;
        return route.fulfill({ status: 201, json: { dataset: summary() } });
      }
      if (req.method() !== "GET") throw new Error("Unexpected write " + path);
      return route.continue();
    });
    await page.goto(base + "/ko/workspaces/" + original.workspace_id);
    await expect(page.locator(".sample-checkbox")).toHaveCount(24);
    await expect(
      page.getByRole("button", { name: "선택 이동", exact: true }),
    ).toHaveCount(0);
    await page.locator(".sample-checkbox").first().check();
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await expect(page.locator(".sample-checkbox")).toHaveCount(6);
    await page.locator(".sample-checkbox").first().check();
    await expect(page.locator(".selection-toolbar")).toContainText("2개 선택");
    await page
      .getByRole("combobox", { name: "이동할 데이터 구분", exact: true })
      .selectOption("test");
    await page.getByRole("button", { name: "선택 이동", exact: true }).click();
    await expect(page.getByText("검증용 충돌", { exact: true })).toBeVisible();
    await expect(page.locator(".selection-toolbar")).toContainText("2개 선택");
    failMove = false;
    await page.getByRole("button", { name: "선택 이동", exact: true }).click();
    await expect(page.locator(".selection-toolbar")).toContainText("0개 선택");
    assert.deepEqual(submitted.sample_ids, [rows[0].id, rows[24].id]);
    assert.equal(submitted.split, "test");
    await page.locator(".sample-review").first().click();
    let dialog = page.getByRole("dialog", { name: "레이블 상세", exact: true });
    await expect(
      dialog.getByRole("combobox", { name: "데이터 구분", exact: true }),
    ).toHaveValue("test");
    await dialog
      .getByRole("combobox", { name: "데이터 구분", exact: true })
      .selectOption("validation");
    await dialog
      .getByRole("button", { name: "상세 닫기", exact: true })
      .click();
    await expect(dialog.locator(".label-discard")).toBeVisible();
    await dialog
      .getByRole("button", { name: "수정 버리기", exact: true })
      .click();
    await page.locator(".sample-review").first().click();
    await expect(
      dialog.getByRole("combobox", { name: "데이터 구분", exact: true }),
    ).toHaveValue("test");
    await dialog
      .getByRole("combobox", { name: "데이터 구분", exact: true })
      .selectOption("validation");
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "저장", exact: true }),
    ).toBeDisabled();
    assert.equal(submitted.split, "validation");
    assert.equal(submitted.human_verified, true);
    await dialog
      .getByRole("button", { name: "상세 닫기", exact: true })
      .click();
    await page.locator(".sample-checkbox").nth(1).check();
    await page.locator(".sample-checkbox").nth(2).check();
    await page.getByRole("button", { name: "선택 삭제", exact: true }).click();
    dialog = page.getByRole("dialog", {
      name: "선택 이미지 삭제",
      exact: true,
    });
    await expect(dialog).toContainText("28개 이미지는 유지됩니다.");
    await dialog.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    assert.equal(deleted.sample_ids.length, 2);
    await page
      .locator(".tabs")
      .getByRole("button", { name: "학습", exact: true })
      .click();
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await expect(page.locator(".sample-card")).toHaveCount(2);
    for (const remaining of [1, 24]) {
      await page.locator(".sample-review").first().click();
      const editor = page.getByRole("dialog", {
        name: "레이블 상세",
        exact: true,
      });
      await editor
        .getByRole("combobox", { name: "데이터 구분", exact: true })
        .selectOption("validation");
      await editor.getByRole("button", { name: "저장", exact: true }).click();
      await expect(
        editor.getByRole("button", { name: "저장", exact: true }),
      ).toBeDisabled();
      await editor
        .getByRole("button", { name: "상세 닫기", exact: true })
        .click();
      await expect(page.locator(".sample-card")).toHaveCount(remaining);
    }
    await expect(page.locator(".pagination")).toContainText("1 / 1");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(
      "Split dropdown, discard/save, cross-page checkboxes, bulk move/conflict/delete, filtered last-page removal and mobile passed. All writes mocked.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
