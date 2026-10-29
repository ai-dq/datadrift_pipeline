const { selectDataset } = require("./dataset-selection.cjs");
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
const dir = process.env.UPLOAD_TEST_DIR;
if (!dir)
  throw new Error(
    "Set UPLOAD_TEST_DIR to a directory with sample-0.jpg, sample-1.jpg and config.json (trained_model).",
  );
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json")));
const gpu = process.env.UPLOAD_GPU_TEST === "1";
const receipt = {
  workspace_id: null,
  datasets: [],
  jobs: [],
  gpu,
  results: [],
};
const save = () =>
  fs.writeFileSync(
    path.join(dir, "receipt.json"),
    JSON.stringify(receipt, null, 2),
  );
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const workspace = await (
      await page.request.post(base + "/api/workspaces", {
        data: {
          name: "QA 이미지 업로드 검증",
          description: "업로드 및 모델 선택 동작 검증",
        },
      })
    ).json();
    receipt.workspace_id = workspace.id;
    save();
    await page.goto(base + "/ko/workspaces/" + workspace.id);
    await page
      .getByRole("button", { name: "이미지 업로드", exact: true })
      .click();
    let dialog = page.getByRole("dialog", {
      name: "이미지 업로드",
      exact: true,
    });
    await dialog
      .getByLabel("이미지 파일", { exact: true })
      .setInputFiles([
        path.join(dir, "sample-0.jpg"),
        path.join(dir, "sample-1.jpg"),
      ]);
    await expect(dialog.getByLabel("상품 카테고리")).toHaveCount(0);
    await page.screenshot({
      path: path.join(dir, "upload-dialog.png"),
      fullPage: true,
    });
    const uploadResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/images?") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "업로드", exact: true }).click();
    const result = await (await uploadResponse).json();
    assert.equal(result.dataset.count, 2, JSON.stringify(result));
    receipt.datasets.push(result.dataset.id);
    save();
    const raw = result.dataset.id;
    await expect(page.locator(".sample-card")).toHaveCount(2);
    await expect(page.locator(".workspace-label-status")).toContainText(
      "미레이블 2개",
    );
    await expect(page.locator(".sample-card").first()).toContainText(
      "미레이블",
    );
    await page.reload();
    await expect(page.locator(".sample-card")).toHaveCount(2);
    for (const modelId of ["qwen35_2b", config.trained_model]) {
      await page.reload();
      await page
        .getByRole("button", { name: "자동 레이블링", exact: true })
        .click();
      dialog = page.getByRole("dialog", { name: "자동 레이블링", exact: true });
      const select = dialog.getByLabel("레이블링 모델");
      await expect(
        select.locator(`option[value="${config.trained_model}"]`),
      ).toBeEnabled();
      await expect(select.locator('option[value="qwen35_2b"]')).toBeEnabled();
      await select.selectOption(modelId);
      await page.screenshot({
        path: path.join(dir, `model-${modelId}.png`),
        fullPage: true,
      });
      if (!gpu) {
        await page.route("**/api/jobs", async (route) => {
          if (route.request().method() !== "POST") return route.continue();
          assert.equal(route.request().postDataJSON().model_id, modelId);
          await route.fulfill({ json: { id: "mock-label-job" } });
        });
      }
      const jobResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/jobs") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "레이블링 시작" }).click();
      const response = await jobResponse;
      assert.equal(response.status(), gpu ? 201 : 200);
      const job = await response.json();
      if (!gpu) {
        await page.unroute("**/api/jobs");
        continue;
      }
      receipt.jobs.push(job.id);
      save();
      console.log("started", modelId, job.id);
      let completed;
      for (let i = 0; i < 1200; i++) {
        const current = await (
          await page.request.get(base + "/api/jobs/" + job.id)
        ).json();
        if (["succeeded", "failed", "cancelled"].includes(current.status)) {
          completed = current;
          break;
        }
        if (i % 15 === 0) console.log(current.status, current.progress);
        await page.waitForTimeout(1000);
      }
      assert.equal(completed?.status, "succeeded", JSON.stringify(completed));
      assert.equal(completed.result.teacher.model_id, modelId);
      if (modelId === config.trained_model)
        assert(completed.result.teacher.adapter_sha256);
      receipt.datasets.push(completed.result.dataset_id);
      receipt.results.push(completed.result);
      save();
      await page.getByRole("button", { name: "새로고침", exact: true }).click();
      if (
        (await page
          .locator(".dataset-current")
          .getAttribute("data-dataset-id")) !== completed.result.dataset_id
      ) {
        await page
          .getByRole("button", { name: "레이블 결과 보기", exact: true })
          .click();
      }
      await expect(page.locator(".dataset-current")).toHaveAttribute(
        "data-dataset-id",
        completed.result.dataset_id,
      );
      await expect(page.locator(".sample-card")).toHaveCount(2);
      await page.locator(".sample-review").first().click();
      await expect(
        page.getByRole("dialog", { name: "레이블 상세" }),
      ).toBeVisible();
      await page.getByText("AI 판독 원문:", { exact: false }).click();
      await expect(page.locator(".label-editor pre").first()).toBeVisible();
      await page.getByRole("button", { name: "상세 닫기" }).click();
      console.log(
        "completed",
        modelId,
        "parse failures",
        completed.result.parse_failures,
      );
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page
      .getByRole("button", { name: "이미지 업로드", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "이미지 업로드" }),
    ).toBeVisible();
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "이미지 업로드" }),
    ).toHaveCount(0);
    assert.deepEqual(errors, []);
    console.log(
      gpu
        ? "PASS: image upload, DB reload, actual GPU labeling results, model selection, mobile dialog"
        : "PASS: image upload, DB reload, raw label state, mocked model requests, mobile dialog",
    );
  } finally {
    save();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
