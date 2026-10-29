const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const endpoints = [
      {
        id: "qa-base-api",
        name: "기본 모델 API",
        model_name: "Qwen3.5-2B",
        model_id: "qwen35_2b",
        enabled: true,
        available: true,
      },
      {
        id: "qa-trained-api",
        name: "학습된 모델 API",
        model_name: "Qwen3.5-4B 학습 모델",
        model_id: "qa-trained",
        enabled: false,
        available: true,
      },
    ].map((e) => ({ ...e, path: `/api/model-endpoints/${e.id}/predictions` }));
    const attrs = {
      fit: "레귤러핏",
      length: "unknown",
      sleeve: "반소매",
      neckline: "unknown",
      pattern: "무지",
      details: [],
      fabric: "unknown",
      origin: "unknown",
      color_code: "unknown",
    };
    const prediction = (id, category = "상의") => ({
      id,
      status: "succeeded",
      created_at: "2026-10-29T00:00:00Z",
      result_url: "/api/predictions/" + id,
      category,
      result: {
        category,
        category_valid: !!category,
        attributes: attrs,
        excluded_attributes: category ? [] : Object.keys(attrs),
        schema_valid: !!category,
        parse_valid: true,
        processing_seconds: 1.2,
        raw: "{}",
      },
    });
    const histories = {
      "qa-base-api": [prediction("base-request")],
      "qa-trained-api": [prediction("trained-request")],
    };
    await page.route("**/api/model-endpoints", (route) =>
      route.fulfill({ json: endpoints }),
    );
    await page.route(/\/api\/model-endpoints\/[^/?]+$/, async (route) => {
      assert.equal(route.request().method(), "PATCH");
      const endpoint = endpoints.find((e) =>
        route
          .request()
          .url()
          .endsWith("/" + e.id),
      );
      endpoint.enabled = route.request().postDataJSON().enabled;
      await route.fulfill({ json: endpoint });
    });
    let submitted;
    let inferredCategory = "상의";
    await page.route("**/api/model-endpoints/*/predictions*", async (route) => {
      const url = new URL(route.request().url());
      const eid = url.pathname.split("/")[3];
      if (route.request().method() === "POST") {
        submitted = url;
        assert(!url.searchParams.has("category"));
        assert.match(
          route.request().headers()["content-type"],
          /multipart\/form-data/,
        );
        const result = prediction(
          "new-request-" + inferredCategory,
          inferredCategory,
        );
        histories[eid].unshift(result);
        await route.fulfill({ status: 202, json: result });
      } else
        await route.fulfill({
          json: { items: histories[eid], total: histories[eid].length },
        });
    });
    await page.goto(base + "/ko/model-api");
    const registry = page.getByRole("region", {
      name: "등록된 API",
      exact: true,
    });
    await expect(registry.locator(".endpoint-card")).toHaveCount(2);
    let workspace = page.locator(".api-workspace");
    await expect(workspace.getByRole("heading", { level: 2 })).toHaveText(
      "기본 모델 API",
    );
    for (const name of ["연결 정보", "요청 테스트", "요청 이력"])
      await expect(
        workspace.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
    await expect(
      registry.getByRole("heading", { name: "요청 이력" }),
    ).toHaveCount(0);
    await expect(
      page.locator(".endpoint-card.selected .endpoint-selection"),
    ).toHaveText("선택됨");
    await expect(workspace.locator("tbody .text-button")).toHaveText(
      "base-req",
    );
    await registry.locator(".endpoint-select").nth(1).click();
    await expect(workspace.getByRole("heading", { level: 2 })).toHaveText(
      "학습된 모델 API",
    );
    await expect(workspace.locator(".api-reception-state")).toHaveText(
      "신규 요청 접수 중지",
    );
    await expect(workspace.locator("tbody .text-button")).toHaveText(
      "trained-",
    );
    await expect(workspace.getByLabel("요청 주소")).toHaveValue(
      base + endpoints[1].path,
    );
    await expect(
      workspace.getByRole("button", { name: "요청 보내기", exact: true }),
    ).toBeDisabled();
    await registry
      .locator(".endpoint-card")
      .nth(1)
      .getByRole("button", { name: "접수 시작", exact: true })
      .click();
    await expect(workspace.locator(".api-reception-state")).toHaveText(
      "신규 요청 접수 중",
    );
    await expect(
      workspace.getByRole("combobox", { name: "상품 카테고리" }),
    ).toHaveCount(0);
    await workspace.getByText("호출 방법", { exact: true }).click();
    await expect(workspace.locator(".api-code").first()).not.toContainText(
      "?category=",
    );
    await workspace.getByLabel("이미지", { exact: true }).setInputFiles({
      name: "mock.png",
      mimeType: "image/png",
      buffer: Buffer.from("mocked request only"),
    });
    await workspace
      .getByRole("button", { name: "요청 보내기", exact: true })
      .click();
    await expect(
      workspace.getByRole("region", { name: "요청 결과", exact: true }),
    ).toContainText("상품 카테고리: 상의");
    assert.equal(submitted.pathname, endpoints[1].path);
    assert.equal(
      await workspace.locator(".api-detail-grid .prediction-result").count(),
      0,
    );
    inferredCategory = null;
    await workspace
      .getByRole("button", { name: "요청 보내기", exact: true })
      .click();
    await expect(
      workspace.getByRole("region", { name: "요청 결과", exact: true }),
    ).toContainText("판별하지 못함");
    await expect(workspace.locator(".prediction-result tbody tr")).toHaveCount(
      9,
    );
    await expect(
      workspace.locator(".prediction-result tbody tr").first(),
    ).toContainText("판정 제외");
    await registry.locator(".endpoint-select").first().click();
    await expect(
      workspace.getByRole("region", { name: "요청 결과", exact: true }),
    ).toHaveCount(0);
    await expect(
      workspace.getByRole("button", { name: "요청 보내기", exact: true }),
    ).toBeDisabled();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert(
        !(await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
        "API overflow at " + width,
      );
      fs.mkdirSync(".runtime/model-api-layout", { recursive: true });
      await page.screenshot({
        path: `.runtime/model-api-layout/page-${width}.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      "API registry/detail/result/history separation, endpoint switch and stop/start, category-free multipart, inferred/unknown category and mobile passed. All mutations mocked.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
