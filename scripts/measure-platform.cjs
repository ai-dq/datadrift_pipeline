#!/usr/bin/env node
// Real-browser page/function completion benchmark. No training, saving or deletion.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { performance } = require("node:perf_hooks");
const {
  summarize,
  itemAverage,
  trialTable,
  renderedReady,
} = require("./performance/metrics.cjs");
function option(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  if (i < 0) return fallback;
  if (!process.argv[i + 1] || process.argv[i + 1].startsWith("--"))
    throw new Error("Missing value for --" + name);
  return process.argv[i + 1];
}
if (process.argv.includes("--help")) {
  console.log(`통합 플랫폼 화면·기능 응답 시간 측정
  npm run measure:platform                         각 항목 5회, 사용자 1명
  npm run measure:platform -- --repeats 3           각 항목 3회
  npm run measure:platform -- --vus 1,5 --repeats 5 동시 사용자별 비교
  --base-url URL     대상 플랫폼 주소
  --target-ms 2500   평균 목표(ms)
  --timeout-ms 30000 준비 조건 대기 제한(ms)
  --output PATH      새 결과 폴더(기존 결과 덮어쓰기 금지)

워밍업은 항목별 1회이며 평균에서 제외합니다.
콘솔과 report.html/trials.csv에 각 회차 시간, 항목 평균, 전체 항목 평균을 표시합니다.
전체 항목 평균 = 각 항목 평균의 합 / 항목 수. 실패는 별도 표시합니다.`);
  process.exit(0);
}
const base = option(
  "base-url",
  process.env.TEST_BASE_URL || "http://121.126.210.3:18091",
).replace(/\/$/, "");
const repeats = Number(option("repeats", "5"));
const vus = option("vus", "1").split(",").map(Number);
const targetMs = Number(option("target-ms", "2500"));
const timeoutMs = Number(option("timeout-ms", "30000"));
const output = path.resolve(
  option(
    "output",
    ".runtime/platform-latency/" +
      new Date().toISOString().replace(/[:.]/g, "-"),
  ),
);
if (
  ![repeats, ...vus].every((n) => Number.isInteger(n) && n > 0) ||
  vus.some((n) => n > 20) ||
  !Number.isFinite(targetMs) ||
  targetMs <= 0 ||
  !Number.isFinite(timeoutMs) ||
  timeoutMs <= 0
)
  throw new Error("Invalid repeats/vus/target/timeout (VU limit 20)");
const services = [
  "datadrift-pipeline-web",
  "datadrift-pipeline-api",
  "datadrift-pipeline-worker",
];
function command(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    return { unavailable: true, message: e.message.split("\n")[0] };
  }
}
function cpu() {
  return os.cpus().reduce(
    (a, c) => ({
      idle: a.idle + c.times.idle,
      total: a.total + Object.values(c.times).reduce((x, y) => x + y, 0),
    }),
    { idle: 0, total: 0 },
  );
}
async function get(route) {
  const r = await fetch(base + "/api/" + route, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(route + ": HTTP " + r.status);
  return r.json();
}
async function snapshot() {
  const [health, workspaces, datasets, models, jobs, experiment] =
    await Promise.all(
      [
        "health",
        "workspaces",
        "datasets",
        "models?summary=true",
        "jobs?summary=true",
        "experiments/relabel-drift",
      ].map(get),
    );
  return {
    timestamp: new Date().toISOString(),
    health,
    counts: {
      workspaces: workspaces.length,
      datasets: datasets.length,
      models: models.length,
      jobs: jobs.length,
    },
    activeJobs: jobs
      .filter((j) => ["queued", "running"].includes(j.status))
      .map((j) => ({ id: j.id, kind: j.request.kind, status: j.status })),
    experimentStatus: experiment.status,
    servicesOnLoadGenerator: command("systemctl", [
      "--user",
      "show",
      ...services,
      "-p",
      "Id",
      "-p",
      "ActiveState",
      "-p",
      "SubState",
      "-p",
      "MainPID",
    ]),
    gpuOnLoadGenerator: command("nvidia-smi", [
      "--query-gpu=name,utilization.gpu,memory.used,memory.total",
      "--format=csv,noheader",
    ]),
  };
}
async function scenarios() {
  const [workspaces, datasets, models, jobs, experiment] = await Promise.all(
    [
      "workspaces",
      "datasets",
      "models?summary=true",
      "jobs",
      "experiments/relabel-drift",
    ].map(get),
  );
  const training = jobs.find((j) =>
    ["training", "labeling"].includes(j.request.kind),
  );
  const evaluation = jobs.find((j) => j.request.kind === "evaluation");
  const drift = jobs.find((j) => j.request.kind === "drift");
  const olderDrift = jobs.find(
    (j) =>
      j.request.kind === "drift" &&
      j.id !== drift?.id &&
      j.result?.fields?.length,
  );
  if (
    !training?.progress?.history?.length ||
    !evaluation?.result?.count ||
    !drift?.result?.fields?.length ||
    !olderDrift
  )
    throw new Error(
      "Benchmark requires populated latest training/evaluation/drift results and an older drift result; never silently skip a scenario",
    );
  const trainingLog = await get("jobs/" + training.id + "/logs");
  const readyModel = models.find(
    (m) => m.kind === "lora" && m.status === "ready" && m.available,
  );
  if (!readyModel) throw new Error("No trained model available");
  const common = [
    { selector: "main h1", min: 1, visible: true },
    { api: "/api/datasets" },
  ];
  const run = (j) => [
    { selector: ".run-head", text: j.id.slice(0, 8), visible: true },
    { api: "/api/jobs/" + j.id },
  ];
  const driftChecks = (j) => [
    ...run(j),
    { selector: ".metric-row", count: j.result.fields.length },
  ];
  const defs = [
    {
      id: "workspaces",
      name: "워크스페이스 목록",
      route: "workspaces",
      conditions: [
        { selector: ".workspace-card", count: workspaces.length },
        { api: "/api/workspaces" },
      ],
    },
  ];
  for (const ws of ["musinsa", "gsshop"]) {
    const d = datasets.find((d) => d.workspace_id === ws);
    if (!d) throw new Error("Missing workspace dataset: " + ws);
    defs.push({
      id: ws,
      name: ws === "musinsa" ? "무신사 데이터·이미지" : "GS SHOP 데이터·이미지",
      route: "workspaces/" + ws,
      conditions: [
        { selector: ".sample-card", count: Math.min(d.count, 24) },
        { api: "/api/datasets/" + d.id + "/samples" },
        {
          selector: 'select[aria-label="데이터셋 버전"] option',
          count: datasets.filter((d) => d.workspace_id === ws).length,
        },
      ],
    });
  }
  defs.push(
    {
      id: "reconstruction",
      name: "데이터 재구성 설정",
      route: "reconstruction",
      conditions: [
        { selector: ".check-row", count: datasets.length },
        { selector: ".check-row input:checked", min: 1 },
        { api: "/api/workspaces" },
      ],
    },
    {
      id: "models",
      name: "모델 목록",
      route: "models",
      conditions: [
        { selector: "tbody tr", count: models.length },
        { api: "/api/models" },
      ],
    },
    {
      id: "model-detail",
      name: "학습된 모델 상세",
      route: "models/" + readyModel.id,
      conditions: [
        {
          selector: "main h2",
          text: readyModel.name
            .replace(/\s*[·ㆍ]\s*/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        },
        {
          selector: 'a[href="/ko/training/' + readyModel.id + '"]',
          visible: true,
        },
        { api: "/api/models" },
      ],
    },
    {
      id: "training",
      name: "모델 학습 설정",
      route: "training",
      conditions: [
        { selector: "form select option", min: 2 },
        {
          selector: 'form button[type="submit"],form button:not([type])',
          visible: true,
          enabled: true,
        },
        { api: "/api/models" },
      ],
    },
    {
      id: "evaluation",
      name: "모델 평가 결과",
      route: "evaluation",
      conditions: [
        ...run(evaluation),
        {
          selector: ".metric-row",
          count: Object.keys(evaluation.result.fields).length,
        },
        { selector: "details", count: evaluation.result.predictions.length },
      ],
    },
    {
      id: "training-monitor",
      name: "학습 모니터링·로그",
      route: "monitoring/training",
      conditions: [
        ...run(training),
        {
          selector: 'svg[aria-label="학습 손실 곡선"] circle',
          count: training.progress.history.length,
        },
        {
          selector: "pre.logs",
          min: 1,
          ...(trainingLog.text ? { textLength: trainingLog.text.length } : {}),
        },
        { api: "/api/jobs/" + training.id + "/logs" },
      ],
    },
    {
      id: "drift",
      name: "드리프트 분석·비교 결과",
      route: "monitoring/drift",
      conditions: [
        ...driftChecks(drift),
        { api: "/api/experiments/relabel-drift" },
        ...(experiment.comparisons?.length
          ? [
              { selector: ".panel", text: "재학습 비교" },
              {
                selector: ".panel table tbody tr",
                min: experiment.comparisons.length,
              },
            ]
          : []),
      ],
    },
  );
  for (const def of defs) {
    def.type = "page";
    def.conditions = [...common, ...def.conditions];
  }
  defs.push(
    {
      id: "label-open",
      name: "레이블 상세 열기",
      type: "function",
      setup: "gsshop",
      action: { selector: ".sample-card", first: true },
      conditions: [
        { selector: '[role="dialog"]', visible: true },
        { selector: ".label-form-fields", enabled: true, min: 1 },
        { selector: ".label-form-fields select option", min: 1 },
        { api: "/api/label-schema" },
      ],
    },
    {
      id: "reconstruction-preview",
      name: "재구성 미리보기",
      type: "function",
      setup: "reconstruction",
      action: { role: "button", name: "미리보기" },
      conditions: [
        { selector: "code.hash", min: 1 },
        { selector: '[role="status"]', text: "미리보기를 계산했습니다" },
        { api: "/api/reconstructions/preview" },
      ],
    },
    {
      id: "drift-history",
      name: "과거 드리프트 결과 선택",
      type: "function",
      setup: "drift",
      action: { role: "button", name: olderDrift.id.slice(0, 8) },
      conditions: driftChecks(olderDrift),
    },
  );
  return {
    definitions: defs,
    fixtures: {
      trainingJob: training.id,
      evaluationJob: evaluation.id,
      driftJob: drift.id,
      olderDriftJob: olderDrift.id,
      model: readyModel.id,
      datasetVersions: datasets.map((d) => ({
        id: d.id,
        count: d.count,
        workspace: d.workspace_id,
      })),
    },
  };
}
async function runSample(
  browser,
  definition,
  definitions,
  user,
  round,
  concurrency,
  warmup,
) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  await page.addInitScript(() => {
    performance.setResourceTimingBufferSize(5000);
    document.addEventListener(
      "click",
      () => {
        window.__benchmarkActionStart = performance.now();
      },
      true,
    );
  });
  const errors = [],
    ignoredPrefetchAborts = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      errors.push("HTTP " + r.status() + " " + new URL(r.url()).pathname);
  });
  page.on("requestfailed", (r) => {
    if (
      r.headers()["next-router-prefetch"] === "1" &&
      r.failure()?.errorText === "net::ERR_ABORTED"
    ) {
      ignoredPrefetchAborts.push(new URL(r.url()).pathname);
      return;
    }
    errors.push(
      "Request failed " +
        new URL(r.url()).pathname +
        ": " +
        r.failure()?.errorText,
    );
  });
  const sample = {
    id: definition.id,
    name: definition.name,
    type: definition.type,
    user,
    round,
    concurrency,
    warmup,
    timestamp: new Date().toISOString(),
  };
  let actionStarted = false;
  const wallStart = performance.now();
  try {
    if (definition.type === "page") {
      await page.goto(base + "/ko/" + definition.route, {
        waitUntil: "commit",
      });
    } else {
      const setup = definitions.find((d) => d.id === definition.setup);
      await page.goto(base + "/ko/" + setup.route, { waitUntil: "commit" });
      await page.evaluate(renderedReady, {
        conditions: setup.conditions,
        timeoutMs,
      });
      if (errors.length) throw new Error("Setup errors: " + errors.join("; "));
      const locator = definition.action.selector
        ? page.locator(definition.action.selector).first()
        : page.getByRole(definition.action.role, {
            name: definition.action.name,
            exact: true,
          });
      await locator.click();
      actionStarted = true;
    }
    Object.assign(
      sample,
      await page.evaluate(renderedReady, {
        conditions: definition.conditions,
        timeoutMs,
        action: definition.type === "function",
      }),
    );
    if (errors.length) throw new Error(errors.join("; "));
    sample.ok = true;
    sample.ignoredPrefetchAborts = ignoredPrefetchAborts;
  } catch (e) {
    sample.ok = false;
    sample.error = e.message;
    sample.failureStage =
      definition.type === "function" && !actionStarted
        ? "setup"
        : "measurement";
    sample.observedWallMs = performance.now() - wallStart;
    // A timeout is a failure, not a fabricated 30s latency or a silently omitted sample.
    delete sample.durationMs;
  } finally {
    await context.close();
  }
  fs.appendFileSync(
    path.join(output, "samples.jsonl"),
    JSON.stringify(sample) + "\n",
  );
  return sample;
}
const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
function writeReports(report) {
  const csv = [
    "vus,scenario,type,attempts,successes,failures,mean_seconds,p50_seconds,p95_seconds,max_seconds,over_target,target_met",
  ];
  const secs = (n) => (n == null ? "—" : (n / 1000).toFixed(3));
  let sections = "";
  const trialsCsv = [];
  const quote = (value) => '"' + String(value).replaceAll('"', '""') + '"';
  for (const group of report.groups) {
    const table = trialTable(group, report.repeats);
    trialsCsv.push(
      [`동시 ${group.concurrency}명`],
      table.headers,
      ...table.rows.map((row) => table.headers.map((key) => row[key])),
      [],
    );
    const trialHtml = `<table><thead><tr>${table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${table.headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    sections += `<section><h2>동시 ${group.concurrency}명 · 각 항목 ${report.repeats}회</h2>${trialHtml}<p>전체 항목 평균 = 항목별 평균의 합 ÷ ${group.scenarios.length}. 표시값은 소수 셋째 자리로 반올림하며 계산은 원시 정밀도를 사용합니다.</p></section>`;
    const rows = group.scenarios
      .map((row) => {
        const s = row.stats;
        csv.push(
          [
            group.concurrency,
            row.id,
            row.type,
            s.attempts,
            s.successes,
            s.failures,
            secs(s.meanMs),
            secs(s.p50Ms),
            secs(s.p95Ms),
            secs(s.maxMs),
            s.overTarget,
            s.targetMet,
          ].join(","),
        );
        return `<tr><td>${escapeHtml(row.name)}</td><td>${row.type === "page" ? "화면" : "기능"}</td><td>${s.successes}/${s.attempts}</td><td>${secs(s.meanMs)}</td><td>${secs(s.p95Ms)}</td><td>${secs(s.maxMs)}</td><td>${s.failures}</td><td>${s.targetMet ? "충족" : "미충족"}</td></tr>`;
      })
      .join("");
    sections += `<section><h2>보조 통계 · 동시 ${group.concurrency}명</h2><p>화면 평균 ${secs(group.pages.meanMs)}초 · 기능 평균 ${secs(group.functions.meanMs)}초 · 전체 p95 ${secs(group.overall.p95Ms)}초 · 실패 ${group.overall.failures}/${group.overall.attempts}</p><table><thead><tr><th>시나리오</th><th>구분</th><th>성공/시도</th><th>평균(초)</th><th>p95(초)</th><th>최대(초)</th><th>실패</th><th>평균 목표</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }
  fs.writeFileSync(
    path.join(output, "trials.csv"),
    "\uFEFF" +
      trialsCsv.map((row) => row.map(quote).join(",")).join("\n") +
      "\n",
  );
  fs.writeFileSync(path.join(output, "summary.csv"), csv.join("\n") + "\n");
  fs.writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(
    path.join(output, "report.html"),
    `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>통합 플랫폼 응답 지연 측정</title><style>body{font:16px/1.65 system-ui,sans-serif;color:#172b4d;background:#f3f6fa;margin:0;padding:32px}main{max-width:1100px;margin:auto}section{background:white;padding:24px;border:1px solid #dce3ed;border-radius:12px;margin:24px 0;overflow:auto}h1{font-size:28px}h2{font-size:21px}table{border-collapse:collapse;width:100%;white-space:nowrap}th,td{padding:10px;text-align:right;border-bottom:1px solid #e6eaf0}th:first-child,td:first-child{text-align:left}th{background:#edf3ff}.note{padding:16px;background:#fff4d6;border-radius:8px}code{overflow-wrap:anywhere}</style><main><h1>통합 플랫폼 화면·기능 응답 지연</h1><p>${escapeHtml(report.startedAt)} · ${escapeHtml(base)} · 목표 평균 ${secs(targetMs)}초</p><p class="note">현재 플랫폼 자체 측정입니다. 과제 전체 도구 연계 평가·공인시험 결과가 아닙니다. ${report.environment.sameHost ? "부하 생성기와 서버가 같은 호스트입니다." : "대상 서버와 부하 생성기 배치를 확인하세요."} 학습·추론 완료 시간을 측정하지 않습니다.</p><section><h2>측정 조건</h2><p>실제 Chromium ${escapeHtml(report.environment.browser)} · 1440×1000 · 브라우저 컨텍스트 매회 새로 생성 · 서버 캐시는 유지 · 시나리오별 사용자당 ${repeats}회 · 프로필별 워밍업 1회 제외</p><p>페이지 탐색 시작/기능 클릭 이벤트부터 API 데이터에 맞는 DOM, 현재 페이지의 모든 이미지 decode, 폰트, 연속 2프레임 표시 기회를 확인합니다. 이미지 지연 로딩은 현재 페이지에 한해 eager로 바꿔 화면 아래 이미지도 포함합니다. networkidle 고정 대기는 넣지 않습니다.</p><p>평균·백분위는 성공 표본 기준이며 실패는 별도로 공개합니다. 실패가 하나라도 있으면 목표 충족으로 판정하지 않습니다. 전체 항목 평균은 항목별 평균의 합을 항목 수로 나눕니다. 실패가 있는 항목은 성공분 평균이라고 표시하고 전체 판정은 불완전으로 처리합니다. 화면/기능 평균도 분리합니다.</p></section>${sections}<section><h2>해석 범위</h2><ul>${report.limitations.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul><p>회차별 시간: trials.csv · 원시 측정: samples.jsonl · 요약: summary.csv · 환경/모니터링: report.json</p></section></main></html>`,
  );
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  // Never append a second run to an earlier evidence bundle.
  fs.writeFileSync(path.join(output, "samples.jsonl"), "", { flag: "wx" });
  const startedAt = new Date().toISOString();
  const before = await snapshot();
  fs.writeFileSync(
    path.join(output, "before.json"),
    JSON.stringify(before, null, 2),
  );
  const { definitions, fixtures } = await scenarios();
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const environment = {
    hostname: os.hostname(),
    platform: os.platform(),
    cpuModel: os.cpus()[0]?.model,
    cpuCount: os.cpus().length,
    memoryGB: os.totalmem() / 1024 ** 3,
    node: process.version,
    browser: browser.version(),
    playwright: require("@playwright/test/package.json").version,
    scriptSha256: Object.fromEntries(
      [__filename, path.join(__dirname, "performance/metrics.cjs")].map(
        (file) => [
          path.relative(process.cwd(), file),
          require("node:crypto")
            .createHash("sha256")
            .update(fs.readFileSync(file))
            .digest("hex"),
        ],
      ),
    ),
    gitCommit: command("git", ["rev-parse", "HEAD"]),
    workingTree: command("git", ["status", "--short"]),
    sameHost:
      Object.values(os.networkInterfaces())
        .flat()
        .some((n) => n.address === new URL(base).hostname) ||
      ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  };
  const samples = [],
    monitor = [],
    groups = [];
  let previousCpu = cpu(),
    stage = "startup";
  const timer = setInterval(() => {
    const next = cpu();
    monitor.push({
      timestamp: new Date().toISOString(),
      stage,
      hostCpuPercent:
        100 *
        (1 -
          (next.idle - previousCpu.idle) /
            (next.total - previousCpu.total || 1)),
      loadAverage: os.loadavg(),
      freeMemoryGB: os.freemem() / 1024 ** 3,
      driverRssMB: process.memoryUsage().rss / 1024 ** 2,
    });
    previousCpu = next;
  }, 1000);
  try {
    for (const concurrency of vus) {
      console.log(
        `\n동시 ${concurrency}명 · ${definitions.length}개 항목 × 각 ${repeats}회 = 본 측정 ${concurrency * definitions.length * repeats}회`,
      );
      console.log("준비: 항목별 워밍업 1회 실행(평균에서 제외)");
      stage = `warmup-vu${concurrency}`;
      for (const def of definitions) {
        const result = await runSample(
          browser,
          def,
          definitions,
          0,
          -1,
          concurrency,
          true,
        );
        samples.push(result);
        if (!result.ok)
          throw new Error("Warmup failed for " + def.id + ": " + result.error);
      }
      stage = `measured-vu${concurrency}`;
      for (const def of definitions) {
        console.log(`\n[${def.name}]`);
        const itemSamples = [];
        for (let round = 0; round < repeats; round++) {
          const batch = await Promise.all(
            Array.from({ length: concurrency }, (_, user) =>
              runSample(
                browser,
                def,
                definitions,
                user,
                round,
                concurrency,
                false,
              ),
            ),
          );
          samples.push(...batch);
          itemSamples.push(...batch);
          for (const sample of batch)
            console.log(
              `  ${round + 1}/${repeats}회${concurrency > 1 ? ` · 사용자 ${sample.user + 1}` : ""}: ${sample.ok ? (sample.durationMs / 1000).toFixed(3) + "초" : "실패 — " + sample.error}`,
            );
        }
        const stats = summarize(itemSamples, targetMs);
        console.log(
          `  → 항목 평균: ${stats.meanMs == null ? "계산 불가" : (stats.meanMs / 1000).toFixed(3) + "초"}${stats.failures ? ` (실패 ${stats.failures}건, 성공분 평균)` : ""}`,
        );
      }
      const measured = samples.filter(
        (s) => !s.warmup && s.concurrency === concurrency,
      );
      const group = {
        concurrency,
        overall: summarize(measured, targetMs),
        pages: summarize(
          measured.filter((s) => s.type === "page"),
          targetMs,
        ),
        functions: summarize(
          measured.filter((s) => s.type === "function"),
          targetMs,
        ),
        scenarios: definitions.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          samples: measured
            .filter((s) => s.id === d.id)
            .map(({ round, user, ok, durationMs, error }) => ({
              round,
              user,
              ok,
              durationMs,
              error,
            })),
          stats: summarize(
            measured.filter((s) => s.id === d.id),
            targetMs,
          ),
        })),
      };
      group.itemAverages = {
        all: itemAverage(group.scenarios, targetMs),
        pages: itemAverage(group.scenarios, targetMs, "page"),
        functions: itemAverage(group.scenarios, targetMs, "function"),
      };
      groups.push(group);
      console.log(`\n동시 ${concurrency}명 결과표 (초)`);
      console.table(trialTable(group, repeats).rows);
    }
    stage = "finished";
    const after = await snapshot();
    const report = {
      startedAt,
      finishedAt: new Date().toISOString(),
      base,
      targetMs,
      repeats,
      vus,
      environment,
      before,
      after,
      fixtures,
      definitions,
      groups,
      monitor,
      limitations: [
        "사용자가 지정한 현재 통합 플랫폼만 포함했습니다. 다른 과제 플랫폼·독립 메타데이터 도구와의 연계는 이 결과로 입증하지 않습니다.",
        "웹/API/워커 활성 상태와 작업 큐를 전후 기록했습니다. 서비스 활성과 GPU 학습 부하 실행은 다르며 학습·추론 작업을 추가 제출하지 않았습니다.",
        "같은 호스트 부하 생성의 CPU 경쟁과 짧은 네트워크 경로가 함께 영향을 줍니다. 원격 클라이언트/독립 부하 생성기의 결과와 다를 수 있습니다.",
        "완료된 학습·평가·드리프트 결과 조회 및 설정/미리보기 중심입니다. 저장·삭제·학습 접수 기능과 장시간 지속 부하는 포함하지 않습니다.",
        "고정 동시 사용자 수의 닫힌 부하 모델입니다. 고정 도착률 또는 실제 사용자 트래픽 분포/최대 처리량을 대표하지 않습니다.",
        "화면 완료는 명시한 DOM·이미지·폰트 조건과 렌더 프레임의 대리 지표이며 물리 디스플레이 스캔아웃이나 공인시험 판정이 아닙니다.",
      ],
    };
    writeReports(report);
    for (const g of groups) {
      const a = g.itemAverages.all;
      console.log(
        `\n동시 ${g.concurrency}명 전체 항목 평균: ${a.meanMs == null ? "계산 불가" : (a.meanMs / 1000).toFixed(3) + "초"} / 목표 ${(targetMs / 1000).toFixed(3)}초 · ${!a.complete ? "불완전 — 판정 불가" : a.targetMet ? "목표 이내" : "목표 초과"}`,
      );
    }
    console.log(
      `\n결과 폴더: ${output}\n회차별 표: report.html / trials.csv\n보조 통계: summary.csv / report.json\n원시 기록: samples.jsonl`,
    );
    if (groups.some((g) => !g.itemAverages.all.targetMet)) process.exitCode = 2;
  } finally {
    clearInterval(timer);
    fs.writeFileSync(
      path.join(output, "monitor.json"),
      JSON.stringify(monitor, null, 2),
    );
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
