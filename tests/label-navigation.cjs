const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  try {
    const datasets = await (
      await p.request.get(base + "/api/datasets?current=true")
    ).json();
    const d = datasets.find((d) => d.workspace_id === "gsshop");
    assert(d?.count > 24);
    const rows = (
      await (
        await p.request.get(base + `/api/datasets/${d.id}/samples?limit=26`)
      ).json()
    ).items;
    await p.goto(base + "/ko/workspaces/" + d.workspace_id);
    await p.locator(".sample-review").nth(23).click();
    const dialog = p.getByRole("dialog", { name: "레이블 상세", exact: true });
    await expect(dialog.locator(".label-navigation")).toContainText(
      `24 / ${d.count}`,
    );
    await expect(dialog.locator(".label-header")).not.toContainText("기준");
    await expect(dialog.locator(".label-header")).not.toContainText(
      rows[23].product_id,
    );
    await expect(
      dialog.getByRole("checkbox", { name: /전체 속성을 직접 검토/ }),
    ).toHaveCount(0);
    await expect(dialog.locator(".label-fields-heading")).not.toContainText(
      "Taxonomy",
    );
    await dialog
      .getByRole("button", { name: "다음 이미지", exact: true })
      .click();
    await expect(dialog.locator(".label-navigation")).toContainText(
      `25 / ${d.count}`,
    );
    await expect(dialog.locator(".label-image-stage img")).toHaveAttribute(
      "src",
      `/api/datasets/${d.id}/images/${rows[24].id}`,
    );
    await dialog
      .getByRole("button", { name: "이전 이미지", exact: true })
      .click();
    await expect(dialog.locator(".label-navigation")).toContainText(
      `24 / ${d.count}`,
    );
    let saved;
    await p.route("**/samples/*/labels", async (r) => {
      saved = r.request().postDataJSON();
      await r.fulfill({
        status: 201,
        json: { dataset: d, sample: { ...rows[23], ...saved } },
      });
    });
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog.locator(".label-provenance")).toContainText(
      "검토 완료",
    );
    assert.equal(saved.human_verified, true);
    let cancelled = 0;
    let cancelFails = true;
    await p.route("**/samples/*/review", async (route) => {
      assert.equal(route.request().method(), "DELETE");
      cancelled++;
      if (cancelFails)
        return route.fulfill({
          status: 409,
          json: { detail: "검증용 검토 상태 충돌" },
        });
      await route.fulfill({
        json: {
          dataset: d,
          sample: {
            ...rows[23],
            ...saved,
            human_verified: false,
            reviewed_at: null,
            label_history: [
              { at: new Date().toISOString(), channel: "review_cancelled" },
            ],
          },
        },
      });
    });
    await dialog
      .getByRole("button", { name: "검토 취소", exact: true })
      .click();
    await expect(dialog).toContainText("검증용 검토 상태 충돌");
    await expect(dialog.locator(".label-status")).toHaveText("검토 완료");
    cancelFails = false;
    await dialog
      .getByRole("button", { name: "검토 취소", exact: true })
      .click();
    await expect(dialog.locator(".label-status")).toContainText("검토 대기");
    await expect(
      dialog.getByRole("button", { name: "검토 취소", exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "저장", exact: true }),
    ).toBeEnabled();
    await expect(
      p.getByRole("status").filter({ hasText: "검토를 취소했습니다." }),
    ).toBeVisible();
    await dialog.locator(".label-provenance summary").click();
    await expect(dialog.locator(".label-provenance details")).toContainText(
      "검토 취소",
    );
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog.locator(".label-status")).toHaveText("검토 완료");
    await dialog.getByLabel("검토 메모", { exact: false }).fill("unsaved");
    await dialog
      .getByRole("button", { name: "검토 취소", exact: true })
      .click();
    await expect(dialog.locator(".label-discard")).toBeVisible();
    assert.equal(
      cancelled,
      2,
      "unsaved draft must be resolved before changing review status",
    );
    await dialog
      .getByRole("button", { name: "계속 편집", exact: true })
      .click();
    await dialog.getByLabel("검토 메모", { exact: false }).fill("unsaved");
    await dialog
      .getByRole("button", { name: "다음 이미지", exact: true })
      .click();
    await expect(dialog.locator(".label-discard")).toBeVisible();
    await dialog
      .getByRole("button", { name: "수정 버리기", exact: true })
      .click();
    await expect(dialog.locator(".label-navigation")).toContainText(
      `25 / ${d.count}`,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      !(await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    console.log(
      "Cross-page navigation, save-as-reviewed, review cancellation/failure/re-review/history, unsaved guard and mobile passed. Writes mocked; no production labels changed.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
