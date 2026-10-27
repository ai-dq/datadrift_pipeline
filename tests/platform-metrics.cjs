const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { chromium } = require("@playwright/test");
const {
  summarize,
  renderedReady,
} = require("../scripts/performance/metrics.cjs");

test("mean, nearest-rank percentiles and failure-aware target assessment", () => {
  const data = [100, 200, 300, 400, 500].map((durationMs) => ({
    ok: true,
    durationMs,
  }));
  assert.deepEqual(summarize(data, 300), {
    attempts: 5,
    successes: 5,
    failures: 0,
    meanMs: 300,
    p50Ms: 300,
    p95Ms: 500,
    maxMs: 500,
    overTarget: 2,
    targetMet: true,
  });
  const failed = summarize([...data, { ok: false }], 300);
  assert.equal(failed.targetMet, false);
  assert.equal(failed.meanMs, 300);
  assert.equal(failed.failures, 1);
  assert.equal(summarize([{ ok: false }], 2500).meanMs, null);
  assert.equal(summarize([], 2500).targetMet, false);
});

test("render probe includes delayed DOM, below-fold image decode, and action result; fails incomplete content", async () => {
  const server = http.createServer((req, res) => {
    if (req.url === "/api/result") {
      res.setHeader("Content-Type", "application/json");
      setTimeout(() => res.end('{"ready":true}'), 60);
    } else if (req.url === "/slow.png") {
      res.setHeader("Content-Type", "image/png");
      setTimeout(
        () =>
          res.end(
            Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
              "base64",
            ),
          ),
        450,
      );
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(`<main><h1>fixture</h1><button id="action">show result</button><div style="margin-top:10000px"><img loading="lazy" src="/slow.png"></div></main><script>
      fetch('/api/result').then(r=>r.json()).then(()=>setTimeout(()=>{const x=document.createElement('p');x.id='result';x.textContent='rendered';document.querySelector('main').append(x)},350));
      document.querySelector('#action').onclick=()=>{window.__benchmarkActionStart=performance.now();fetch('/api/result').then(r=>r.json()).then(()=>setTimeout(()=>{document.querySelector('#result').textContent='changed'},100))};
      </script>`);
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:" + server.address().port, {
      waitUntil: "commit",
    });
    const before = await page.evaluate(renderedReady, {
      conditions: [
        { selector: "#result", text: "rendered" },
        { api: "/api/result" },
      ],
      timeoutMs: 3000,
    });
    assert(
      before.durationMs >= 450,
      "must include slow below-fold image, not just HTTP or initial h1",
    );
    assert(before.durationMs > before.navigation.domContentLoadedMs);
    assert.equal(before.imageCount, 1);
    await page.locator("#action").click();
    const action = await page.evaluate(renderedReady, {
      conditions: [
        { selector: "#result", text: "changed" },
        { api: "/api/result" },
      ],
      timeoutMs: 3000,
      action: true,
    });
    assert(action.durationMs >= 160);
    assert.equal(action.navigation, null);
    await assert.rejects(
      page.evaluate(renderedReady, {
        conditions: [{ selector: "#missing", min: 1 }],
        timeoutMs: 80,
      }),
      /Render timeout/,
    );
    await page.evaluate(() => {
      const x = document.createElement("div");
      x.className = "alert error";
      x.textContent = "intentional";
      document.body.append(x);
    });
    await assert.rejects(
      page.evaluate(renderedReady, { conditions: [], timeoutMs: 80 }),
      /UI error: intentional/,
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
