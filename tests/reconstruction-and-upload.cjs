const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const datasets = await (
      await page.request.get(base + "/api/datasets?current=true")
    ).json();
    const target = datasets.find((d) => d.workspace_id === "gsshop");
    assert(target);
    await page.goto(base + "/ko/reconstruction?sources=musinsa,gsshop");
    await page
      .getByLabel("저장할 워크스페이스 이름", { exact: true })
      .fill("검증용 재구성");
    await expect(
      page.getByRole("combobox", { name: "선별 방식", exact: true }),
    ).toHaveValue("balanced_mix");
    await expect(
      page.getByRole("spinbutton", { name: "GS SHOP 혼합 비율", exact: true }),
    ).toHaveValue("50");
    await page
      .getByRole("spinbutton", { name: "GS SHOP 혼합 비율", exact: true })
      .fill("0");
    await expect(
      page.getByRole("spinbutton", { name: /무신사.*혼합 비율/ }),
    ).toHaveValue("100");
    const origins = page.getByRole("group", {
      name: "원본 워크스페이스",
      exact: true,
    });
    await origins.getByRole("checkbox", { name: /GS SHOP/ }).uncheck();
    await expect(
      page.getByRole("spinbutton", { name: /무신사.*혼합 비율/ }),
    ).toBeDisabled();
    await origins.getByRole("checkbox", { name: /GS SHOP/ }).check();
    await expect(
      page.getByRole("spinbutton", { name: "GS SHOP 혼합 비율", exact: true }),
    ).toHaveValue("50");
    for (const method of [
      "merge",
      "random",
      "source_balanced",
      "distribution",
      "balanced_mix",
    ]) {
      await page
        .getByRole("combobox", { name: "선별 방식", exact: true })
        .selectOption(method);
      if (method === "merge")
        await expect(
          page.getByLabel("데이터 수", { exact: true }),
        ).toHaveJSProperty("readOnly", true);
      else await page.getByLabel("데이터 수", { exact: true }).fill("12");
      if (method === "distribution")
        await page
          .getByRole("combobox", {
            name: "분포 기준 워크스페이스",
            exact: true,
          })
          .selectOption(target.id);
      if (method === "balanced_mix") {
        await page
          .getByRole("spinbutton", { name: "GS SHOP 혼합 비율", exact: true })
          .fill("75");
        await expect(
          page.getByRole("spinbutton", { name: /무신사.*혼합 비율/ }),
        ).toHaveValue("25");
      }
      const pending = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/reconstructions/preview") &&
          r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "미리보기", exact: true }).click();
      const response = await pending;
      assert(response.ok(), await response.text());
      const preview = await response.json();
      assert.equal(preview.selection.scope, "train_only");
      assert.equal(preview.count, preview.splits.train);
      assert.equal(preview.splits.validation || 0, 0);
      assert.equal(preview.splits.test || 0, 0);
      assert.equal(
        preview.count,
        method === "merge"
          ? datasets
              .filter((d) => ["musinsa", "gsshop"].includes(d.workspace_id))
              .reduce(
                (n, d) =>
                  n + (d.splits.train || 0) + (d.splits.unassigned || 0),
                0,
              )
          : 12,
      );
      if (method === "distribution") {
        assert.equal(preview.selection.reference_id, target.id);
        assert(Number.isFinite(preview.selection.after_js));
      }
      if (method === "balanced_mix") {
        const gs = preview.selection.mix.find(
          (m) => m.dataset_id === target.id,
        );
        assert.equal(gs.target_ratio, 0.75);
        assert.equal(gs.actual_ratio, 0.75);
        assert.equal(gs.selected_count, 9);
        const row = page.getByRole("row").filter({
          has: page.getByRole("cell", { name: "GS SHOP", exact: true }),
        });
        await expect(row.getByRole("cell").nth(1)).toHaveText("75.0%");
        await expect(row.getByRole("cell").nth(2)).toHaveText("75.0%");
      }
    }
    let saved;
    await page.route("**/api/reconstructions", async (route) => {
      saved = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: target });
    });
    await page
      .getByRole("button", { name: "워크스페이스 생성", exact: true })
      .click();
    await page.waitForURL("**/ko/workspaces/gsshop");
    assert.equal(saved.data_count, 12);
    assert.equal(saved.train_budget, undefined);
    assert.equal(saved.method, "balanced_mix");
    assert.equal(saved.dataset_weights[target.id], 75);
    await page.locator(".sample-card").first().waitFor();
    const actions = [
      page.getByRole("button", { name: "이미지 업로드", exact: true }),
      page.getByRole("button", { name: "워크스페이스 수정", exact: true }),
      page.getByRole("button", { name: "자동 레이블링", exact: true }),
      page.locator(".action-menu > summary"),
      page.getByRole("button", { name: "새로고침", exact: true }),
    ];
    const boxes = await Promise.all(
      actions.map((button) => button.boundingBox()),
    );
    assert(
      boxes.every((box) => Math.abs(box.y - boxes[0].y) < 2),
      "workspace controls must share one row",
    );
    assert(
      (await page
        .getByRole("heading", { name: "GS SHOP", exact: true })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 30,
    );
    const review = page.getByRole("combobox", {
      name: "레이블 검토 상태",
      exact: true,
    });
    const style = await review.evaluate((el) => ({
      padding: parseFloat(getComputedStyle(el).paddingRight),
      appearance: getComputedStyle(el).appearance,
      background: getComputedStyle(el).backgroundImage,
    }));
    assert(
      style.padding >= 36 &&
        style.appearance === "none" &&
        style.background.includes("svg"),
    );
    // The upload form accepts files directly without a category, and sends no category parameter.
    const row = (
      await (
        await page.request.get(
          base + `/api/datasets/${target.id}/samples?limit=1`,
        )
      ).json()
    ).items[0];
    const image = await (
      await page.request.get(
        base + `/api/datasets/${target.id}/images/${row.id}`,
      )
    ).body();
    let uploadUrl;
    await page.route("**/api/workspaces/*/images?*", async (route) => {
      uploadUrl = new URL(route.request().url());
      await route.fulfill({
        status: 201,
        json: {
          dataset: target,
          duplicate: false,
          added_count: 2,
          skipped_duplicates: 0,
        },
      });
    });
    await page
      .getByRole("button", { name: "이미지 업로드", exact: true })
      .click();
    let dialog = page.getByRole("dialog", {
      name: "이미지 업로드",
      exact: true,
    });
    await expect(
      dialog.getByRole("combobox", { name: "상품 카테고리", exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole("combobox", { name: "데이터 분할", exact: true }),
    ).toHaveValue("unassigned");
    await dialog.getByLabel("이미지 파일", { exact: true }).setInputFiles([
      { name: "mixed-a.jpg", mimeType: "image/jpeg", buffer: image },
      { name: "mixed-b.jpg", mimeType: "image/jpeg", buffer: image },
    ]);
    await expect(
      dialog.getByRole("button", { name: "업로드", exact: true }),
    ).toBeEnabled();
    await dialog.getByRole("button", { name: "업로드", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    assert(!uploadUrl.searchParams.has("category"));
    assert.equal(uploadUrl.searchParams.get("split"), "unassigned");
    // A mixed upload can also be categorized later during manual image review.
    const schema = await (
      await page.request.get(
        base + "/api/label-schema?schema_id=bkave-106baf22f720",
      )
    ).json();
    const unclassified = {
      ...row,
      category: null,
      schema_id: "bkave-106baf22f720",
      target: Object.fromEntries(
        Object.keys(schema).map((k) => [k, k === "details" ? [] : "unknown"]),
      ),
      unscored_fields: Object.keys(schema),
      human_verified: false,
      label_state: "unlabeled",
      split: "unassigned",
      ai_labeled: false,
      initial_label: undefined,
    };
    const collection = {
      ...target,
      schema_id: "bkave-106baf22f720",
      count: 1,
      splits: { unassigned: 1, train: 0, validation: 0, test: 0 },
      labeled_count: 0,
      unlabeled_count: 1,
    };
    const workspaces = await (
      await page.request.get(base + "/api/workspaces")
    ).json();
    await page.route("**/api/workspaces", (r) =>
      r.fulfill({
        json: workspaces.map((w) =>
          w.id === target.workspace_id ? { ...w, datasets: [collection] } : w,
        ),
      }),
    );
    await page.route("**/api/datasets?current=true", (r) =>
      r.fulfill({
        json: datasets.map((d) => (d.id === target.id ? collection : d)),
      }),
    );
    await page.route("**/api/datasets/*/samples?*", (r) =>
      r.fulfill({
        json: new URL(r.request().url()).searchParams.get("ids_only")
          ? { ids: [row.id], total: 1 }
          : { items: [unclassified], total: 1 },
      }),
    );
    let labels;
    await page.route("**/samples/*/labels", async (r) => {
      labels = r.request().postDataJSON();
      await r.fulfill({
        status: 201,
        json: { dataset: collection, sample: { ...unclassified, ...labels } },
      });
    });
    await page.goto(base + "/ko/workspaces/gsshop");
    await page.getByRole("button", { name: "미지정", exact: true }).click();
    await page.locator(".sample-review").first().click();
    dialog = page.getByRole("dialog", { name: "레이블 상세", exact: true });
    await expect(
      dialog.getByRole("combobox", { name: "데이터 구분", exact: true }),
    ).toHaveValue("unassigned");
    await expect(dialog.locator(".label-status")).not.toContainText(
      "자동 레이블링 완료",
    );
    await expect(dialog.locator(".label-status")).toHaveText("레이블링 대기");
    await dialog
      .getByRole("combobox", { name: "상품 카테고리", exact: true })
      .selectOption("상의");
    await expect(dialog.getByLabel("핏", { exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "저장", exact: true }),
    ).toBeDisabled();
    assert.equal(labels.category, "상의");
    assert.equal(labels.split, "unassigned");
    await expect(dialog.locator(".label-status")).toHaveText("검토 완료");
    await dialog
      .getByRole("button", { name: "상세 닫기", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.goto(base + "/ko/training");
    await expect(page.locator(".training-summary")).toHaveCount(0);
    await expect(page.getByText("실행 요약", { exact: true })).toHaveCount(0);
    await page.route("**/api/datasets?current=true", (route) =>
      route.fulfill({
        json: [
          ...datasets,
          {
            ...target,
            id: "ratio-third",
            workspace_id: "ratio-third",
            name: "새 데이터",
            schema_id: undefined,
            count: 20,
            splits: { train: 20 },
            unlabeled_count: 0,
          },
        ],
      }),
    );
    await page.goto(
      base + "/ko/reconstruction?sources=musinsa,gsshop,ratio-third",
    );
    const ratios = page.locator(".mix-weights input");
    await expect(ratios).toHaveCount(3);
    await expect(page.getByLabel("데이터 수", { exact: true })).toHaveValue(
      "60",
    );
    const sumRatios = () =>
      ratios.evaluateAll((es) => es.reduce((n, e) => n + Number(e.value), 0));
    assert(Math.abs((await sumRatios()) - 100) < 1e-8);
    await page
      .getByRole("spinbutton", { name: "새 데이터 혼합 비율", exact: true })
      .fill("20");
    assert(Math.abs((await sumRatios()) - 100) < 1e-8);
    await page
      .getByRole("spinbutton", { name: "GS SHOP 혼합 비율", exact: true })
      .fill("33.33");
    assert(Math.abs((await sumRatios()) - 100) < 1e-8);
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    console.log(
      "Five reconstruction methods, balanced default/weights/actual ratios/counts/save payload, workspace controls, upload/manual review and mobile passed. Previews read-only; saves/uploads mocked; no GPU work.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
