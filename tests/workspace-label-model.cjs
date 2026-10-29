const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  try {
    const workspaces = await (
      await p.request.get(base + "/api/workspaces")
    ).json();
    const models = await (
      await p.request.get(base + "/api/labeling-models")
    ).json();
    const model = models.find((m) => m.available && m.status === "ready");
    assert(model);
    const w = workspaces.find((w) =>
      w.datasets.some((d) => d.schema_id?.startsWith("bkave-") && d.count),
    );
    assert(w);
    w.labeling_model_id = null;
    w.labeling_model_name = null;
    let saved;
    await p.route("**/api/workspaces", async (r) => {
      if (r.request().method() === "POST") {
        saved = r.request().postDataJSON();
        await r.fulfill({ status: 201, json: { ...saved, id: "mock-new" } });
      } else await r.fulfill({ json: workspaces });
    });
    await p.route("**/api/workspaces/" + w.id, async (r) => {
      saved = r.request().postDataJSON();
      Object.assign(w, saved, { labeling_model_name: model.name });
      await r.fulfill({ json: w });
    });
    await p.goto(base + "/ko/workspaces");
    await p
      .getByRole("button", { name: "워크스페이스 만들기", exact: true })
      .click();
    let dialog = p.getByRole("dialog");
    await dialog.getByLabel("이름", { exact: true }).fill("모델 설정 확인");
    await dialog
      .getByRole("combobox", { name: "레이블링 모델", exact: true })
      .selectOption(model.id);
    await dialog.getByRole("button", { name: "만들기", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    assert.equal(saved.labeling_model_id, model.id);
    await p.goto(base + "/ko/workspaces/" + w.id);
    await p.getByRole("button", { name: "자동 레이블링", exact: true }).click();
    await expect(
      p.getByRole("combobox", { name: "레이블링 모델", exact: true }),
    ).toHaveValue("");
    await expect(
      p.getByRole("button", { name: "레이블링 시작", exact: true }),
    ).toBeDisabled();
    await p.getByRole("button", { name: "자동 레이블링 닫기" }).click();
    await p
      .getByRole("button", { name: "워크스페이스 수정", exact: true })
      .click();
    dialog = p.getByRole("dialog");
    await dialog
      .getByRole("combobox", { name: "레이블링 모델", exact: true })
      .selectOption(model.id);
    await dialog
      .getByRole("button", { name: "수정 저장", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    assert.equal(saved.labeling_model_id, model.id);
    await expect(p.locator(".workspace-label-model")).toHaveCount(0);
    await p.getByRole("button", { name: "자동 레이블링", exact: true }).click();
    await expect(
      p.getByRole("combobox", { name: "레이블링 모델", exact: true }),
    ).toHaveValue(model.id);
    let submitted;
    await p.route("**/api/jobs", async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 503,
        json: { detail: "검증용 접수 실패" },
      });
    });
    await p.getByRole("button", { name: "레이블링 시작", exact: true }).click();
    await expect(p.getByRole("dialog")).toContainText("검증용 접수 실패");
    assert.equal(submitted.model_id, model.id);
    assert.equal(submitted.kind, "labeling");
    assert(w.datasets.some((d) => d.id === submitted.dataset_id));
    await p.getByRole("button", { name: "자동 레이블링 닫기" }).click();
    await p.goto(base + "/ko/workspaces");
    await expect(
      p.locator(
        '.workspace-card[href="/ko/workspaces/' + w.id + '"] .workspace-model',
      ),
    ).not.toContainText("미설정");
    console.log(
      "Workspace label model: create/edit payload, unset state, saved selection, actual request model ID, failure handling, list/detail consistency passed. Writes mocked; no GPU jobs submitted.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
