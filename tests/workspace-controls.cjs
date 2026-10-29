const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  try {
    let submitted;
    await page.route("**/api/jobs", async (route) => {
      assert.equal(route.request().method(), "POST");
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 503,
        json: { detail: "검증용 접수 차단" },
      });
    });
    await page.goto(base + "/ko/workspaces/gsshop");
    await expect(page.locator(".sample-card")).toHaveCount(24);
    const actions = page.locator(".page-actions");
    await expect(actions.locator(":scope > button")).toHaveText([
      "이미지 업로드",
      "워크스페이스 수정",
      "자동 레이블링",
      "새로고침",
    ]);
    assert(
      await actions
        .locator(":scope > button")
        .evaluateAll((es) =>
          es.every((e) => e.classList.contains("secondary")),
        ),
    );
    const boxes = await actions
      .locator(":scope > button, :scope > details > summary")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert(
      boxes.every(
        (b) =>
          Math.abs(b.y - boxes[0].y) < 1 &&
          Math.abs(b.height - boxes[0].height) < 1,
      ),
    );
    await actions
      .getByRole("button", { name: "이미지 업로드", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "이미지 업로드", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "업로드 닫기", exact: true })
      .click();
    await actions
      .getByRole("button", { name: "워크스페이스 수정", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "워크스페이스 수정", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    const automatic = actions.getByRole("button", {
      name: "자동 레이블링",
      exact: true,
    });
    await expect(automatic).toBeEnabled();
    const modelsResponse = page.waitForResponse((r) =>
      r.url().includes("/api/labeling-models?schema_id="),
    );
    await automatic.click();
    const response = await modelsResponse;
    assert.equal(
      new URL(response.url()).searchParams.get("schema_id"),
      "visual-v1",
    );
    const model = (await response.json()).find(
      (m) => m.available && m.status === "ready",
    );
    assert(model);
    const dialog = page.getByRole("dialog", {
      name: "자동 레이블링",
      exact: true,
    });
    await dialog
      .getByRole("combobox", { name: "레이블링 모델", exact: true })
      .selectOption(model.id);
    await dialog
      .getByRole("button", { name: "레이블링 시작", exact: true })
      .click();
    await expect(dialog).toContainText("검증용 접수 차단");
    assert.equal(submitted.kind, "labeling");
    assert.equal(submitted.model_id, model.id);
    await page
      .getByRole("button", { name: "자동 레이블링 닫기", exact: true })
      .click();
    const menu = actions.locator(".action-menu");
    await menu.locator("summary").click();
    await expect(
      menu.getByRole("link", { name: "레이블 내보내기", exact: true }),
    ).toHaveAttribute("href", /\/export$/);
    await menu
      .getByRole("button", { name: "레이블 검토", exact: true })
      .click();
    await expect(menu).not.toHaveAttribute("open");
    await expect(
      page.getByRole("dialog", { name: "레이블 상세", exact: true }),
    ).toBeVisible();
    const detail = page.getByRole("dialog", {
      name: "레이블 상세",
      exact: true,
    });
    const initialRow = (
      await (
        await page.request.get(
          base + `/api/datasets/${submitted.dataset_id}/samples?limit=1`,
        )
      ).json()
    ).items[0];
    await expect(detail.locator(".label-filename")).toHaveText(
      initialRow.filename,
    );
    await expect(detail.locator(".label-status")).toContainText(
      "자동 레이블링 완료",
    );
    await expect(detail.locator(".label-status")).toContainText("검토 대기");
    await expect(detail.locator(".label-pill")).toHaveCount(0);
    assert(
      await detail
        .locator(".label-status > span")
        .evaluateAll((es) =>
          es.every(
            (e) =>
              getComputedStyle(e).backgroundColor === "rgba(0, 0, 0, 0)" &&
              parseFloat(getComputedStyle(e).borderWidth) === 0,
          ),
        ),
    );
    const history = detail.locator(".label-provenance details");
    await history.locator("summary").click();
    await expect(history).toContainText("GPT-Astra로 레이블링 완료");
    await expect(history).not.toContainText("Invalid Date");
    await expect(history).not.toContainText("Gemma4 E2B");
    await page.getByRole("button", { name: "상세 닫기", exact: true }).click();
    const firstCard = page.locator(".sample-card").first();
    await expect(firstCard.locator(".sample-review")).toHaveText(
      "자동 레이블링 완료검토 대기",
    );
    const checkbox = firstCard.locator(".sample-checkbox");
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await checkbox.press("Space");
    await expect(checkbox).not.toBeChecked();
    for (const width of [1920, 1440, 1000, 390]) {
      await page.setViewportSize({ width, height: 1080 });
      await firstCard.locator("img").click();
      await expect(checkbox).toBeChecked();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const upper = firstCard.locator(".sample-select");
      const area = await upper.boundingBox();
      await upper.click({
        position: { x: area.width - 5, y: area.height - 5 },
      });
      await expect(checkbox).not.toBeChecked();
      await page.locator(".sample-select img").nth(1).click();
      await expect(page.locator(".selection-toolbar")).toContainText(
        "1개 선택",
      );
      await firstCard.locator(".sample-review").click();
      await expect(
        page.getByRole("dialog", { name: "레이블 상세", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "상세 닫기", exact: true })
        .click();
      await expect(checkbox).not.toBeChecked();
      await expect(page.locator(".sample-checkbox").nth(1)).toBeChecked();
      await page
        .getByRole("button", { name: "선택 해제", exact: true })
        .click();
      const columns = await page
        .locator(".sample-grid")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        );
      assert.equal(
        columns,
        width >= 1500 ? 6 : width > 1100 ? 4 : width > 700 ? 3 : 2,
      );
      assert.equal(24 % columns, 0, "every full page must fill all grid rows");
      assert(
        !(await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
        "horizontal overflow at " + width,
      );
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    const gridHeight = await page
      .locator(".sample-page")
      .evaluate((el) => el.getBoundingClientRect().height);
    await page
      .locator(".pagination")
      .getByRole("button", { name: "다음", exact: true })
      .click();
    await expect(page.locator(".sample-page")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator(".sample-card")).toHaveCount(24);
    assert.equal(
      await page
        .locator(".sample-page")
        .evaluate((el) => el.getBoundingClientRect().height),
      gridHeight,
    );
    await page.screenshot({
      path: ".runtime/ui-cleanup/workspace-controls-1920.png",
      fullPage: true,
    });
    console.log(
      "Workspace actions, original-schema labeling request, image/checkbox/keyboard selection, separate label review preserving selection, filename/GPT-Astra history/plain review status, 24-item grids, pagination and overflow passed. Label job blocked; no GPU job submitted.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
