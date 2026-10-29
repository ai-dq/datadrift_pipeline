const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://121.126.210.3:18091";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const jobs = await (
      await page.request.get(base + "/api/jobs?kind=training")
    ).json();
    const template = jobs.find((j) => j.request.kind === "training");
    assert(template, "Existing training fixture required");
    const start = Date.parse("2026-10-29T00:00:00Z");
    await page.clock.install({ time: start + 10000 });
    let job = {
      ...template,
      status: "running",
      started_at: new Date(start).toISOString(),
      finished_at: undefined,
      result: null,
      error: null,
      progress: { phase: "loading", step: 0, total: 20, elapsed_seconds: 0 },
    };
    await page.route(/\/api\/jobs(?:\?|\/|$)/, async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({
        json: url.pathname.endsWith("/logs")
          ? { text: "" }
          : url.pathname === "/api/jobs"
            ? [job]
            : job,
      });
    });
    await page.goto(base + "/ko/monitoring/training");
    const timer = page.getByTestId("run-elapsed");
    await expect(timer).toBeVisible();
    const seconds = async () =>
      Number((await timer.textContent()).replace(/[^0-9]/g, ""));
    const initial = await seconds();
    await page.clock.runFor(1000);
    assert.equal(await seconds(), initial + 1, "Ticks without a new step");
    await page.clock.fastForward(60000);
    assert.equal(
      await seconds(),
      initial + 61,
      "Catches up after a throttled/background interval",
    );
    job = {
      ...job,
      status: "succeeded",
      finished_at: new Date(start + 71000).toISOString(),
    };
    await page.reload();
    await expect(timer).toHaveText("71초");
    await page.clock.runFor(3000);
    await expect(timer).toHaveText("71초");
    job = {
      ...job,
      status: "queued",
      started_at: undefined,
      finished_at: undefined,
    };
    await page.reload();
    await expect(timer).toHaveText("0초");
    console.log(
      "Elapsed timer passed: fixed-step ticking, background catch-up, completion stop, queued zero. No jobs submitted.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
