"use client";
import { useCallback, useEffect, useState } from "react";
import { Pagination, StablePage } from "@/components/paginated-content";
import { displayName } from "@/lib/utils";

type Model = {
  id: string;
  name: string;
  kind: string;
  schema_id?: string;
  available: boolean;
  status: string;
};
type Endpoint = {
  id: string;
  name: string;
  model_name: string;
  model_id: string;
  enabled: boolean;
  available: boolean;
  unavailable_reason?: string;
  path: string;
};
type Prediction = {
  id: string;
  category?: string | null;
  status: string;
  created_at: string;
  queue_position?: number;
  error?: string;
  result_url: string;
  progress?: { phase?: string; elapsed_seconds?: number };
  result?: {
    category?: string | null;
    category_valid?: boolean;
    attributes: Record<string, string | string[]>;
    excluded_attributes: string[];
    schema_valid: boolean;
    parse_valid: boolean;
    raw: string;
    processing_seconds: number;
  };
};
const states: Record<string, string> = {
  queued: "대기 중",
  running: "추출 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소",
};
const labels: Record<string, string> = {
  fit: "핏",
  length: "기장",
  sleeve: "소매 길이",
  neckline: "넥라인",
  pattern: "무늬",
  details: "디자인 디테일",
  fabric: "원단 유형",
  origin: "생산처",
  color_code: "색상 코드",
};
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "요청을 처리하지 못했습니다.",
    );
  return data;
}
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const active = (p: Prediction) => ["queued", "running"].includes(p.status);
export function ModelApi({ refreshToken }: { refreshToken?: unknown }) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState("");
  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<Prediction[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyShownPage, setHistoryShownPage] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [historyError, setHistoryError] = useState("");
  function changeHistoryPage(page: number) {
    setHistoryPage(page);
    setHistoryRefresh((n) => n + 1);
  }
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const endpoint = endpoints.find((e) => e.id === selected) || endpoints[0];
  const reload = useCallback(async () => {
    const [e, m] = await Promise.all([
      request<Endpoint[]>("/api/model-endpoints"),
      request<Model[]>("/api/models"),
    ]);
    setEndpoints(e);
    setModels(
      m.filter(
        (v) =>
          v.available &&
          v.status === "ready" &&
          (v.kind === "base" || v.schema_id?.startsWith("bkave-")),
      ),
    );
  }, []);
  useEffect(() => {
    setOrigin(window.location.origin);
    reload()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reload, refreshToken]);
  useEffect(() => {
    setResult(null);
    setHistory([]);
    setFile(null);
    setHistoryPage(0);
    setHistoryShownPage(0);
    setHistoryError("");
    setHistoryTotal(0);
  }, [endpoint?.id]);
  useEffect(() => {
    if (!endpoint) return;
    setHistoryLoading(true);
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const page = await request<{ items: Prediction[]; total: number }>(
          `/api/model-endpoints/${endpoint!.id}/predictions?paginated=true&offset=${historyPage * 10}&limit=10`,
        );
        if (alive) {
          if (historyPage * 10 >= page.total && historyPage > 0) {
            setHistoryPage(Math.max(0, Math.ceil(page.total / 10) - 1));
            return;
          }
          const values = page.items;
          setHistory(values);
          setHistoryShownPage(historyPage);
          setHistoryError("");
          setHistoryTotal(page.total);
          setHistoryLoading(false);
          setResult((current) =>
            current ? values.find((v) => v.id === current.id) || current : null,
          );
        }
      } catch (e) {
        if (alive) {
          setHistoryError((e as Error).message);
          setHistoryLoading(false);
        }
      }
      if (alive) timer = setTimeout(poll, 2500);
    }
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [endpoint?.id, historyPage, historyRefresh]);
  useEffect(() => {
    if (!result || !active(result)) return;
    let alive = true;
    const timer = setInterval(() => {
      request<Prediction>(result.result_url)
        .then((updated) => {
          if (alive) setResult(updated);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    }, 2500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [result?.id, result?.status]);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const url = origin + (endpoint?.path || "");
  return (
    <div className="model-api">
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      <section
        className="api-registration"
        aria-labelledby="registered-api-heading"
      >
        <div className="panel-heading">
          <h2 id="registered-api-heading">등록된 API</h2>
          <button className="button" onClick={() => setCreating((v) => !v)}>
            {creating ? "닫기" : "API 등록"}
          </button>
        </div>
        {creating && (
          <form
            className="api-create"
            onSubmit={(e) => {
              e.preventDefault();
              perform(async () => {
                const created = await request<Endpoint>(
                  "/api/model-endpoints",
                  json("POST", { name, model_id: model || models[0]?.id }),
                );
                await reload();
                setSelected(created.id);
                setCreating(false);
                setName("");
              });
            }}
          >
            <label className="field">
              API 이름
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 상품 속성 추출"
              />
            </label>
            <label className="field">
              모델
              <select
                value={model || models[0]?.id || ""}
                onChange={(e) => setModel(e.target.value)}
                required
              >
                {!models.length && (
                  <option value="">사용 가능한 모델 없음</option>
                )}
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {displayName(m.name)}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" disabled={busy || !models.length}>
              등록
            </button>
          </form>
        )}
        {!endpoints.length && (
          <p className="empty">
            {loading ? "불러오는 중" : "등록된 API가 없습니다."}
          </p>
        )}
        <div role="group" aria-label="API 모델 선택" className="endpoint-grid">
          {endpoints.map((e) => (
            <article
              key={e.id}
              className={`endpoint-card ${endpoint?.id === e.id ? "selected" : ""}`}
            >
              <button
                type="button"
                className="endpoint-select"
                aria-pressed={endpoint?.id === e.id}
                onClick={() => {
                  setSelected(e.id);
                  setError("");
                }}
              >
                <strong>{e.name}</strong>
                <span>{displayName(e.model_name)}</span>
                <small className="endpoint-selection">
                  {endpoint?.id === e.id ? "선택됨" : "선택"}
                </small>
              </button>
              <footer>
                <span>
                  {!e.available
                    ? "모델 파일 확인 필요"
                    : e.enabled
                      ? "신규 접수 중"
                      : "신규 접수 중지"}
                </span>
                <button
                  className="button secondary"
                  disabled={busy || (!e.enabled && !e.available)}
                  onClick={() =>
                    perform(async () => {
                      await request(
                        `/api/model-endpoints/${e.id}`,
                        json("PATCH", { enabled: !e.enabled }),
                      );
                      await reload();
                    })
                  }
                >
                  {e.enabled ? "접수 중지" : "접수 시작"}
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>
      {endpoint && (
        <section
          className="api-workspace"
          aria-labelledby="selected-api-heading"
        >
          <header className="api-workspace-heading">
            <div>
              <p className="api-section-label">선택한 API</p>
              <h2 id="selected-api-heading">{endpoint.name}</h2>
              <p className="muted">{displayName(endpoint.model_name)}</p>
            </div>
            <p className="api-reception-state">
              {!endpoint.available
                ? "모델 파일 확인 필요"
                : endpoint.enabled
                  ? "신규 요청 접수 중"
                  : "신규 요청 접수 중지"}
            </p>
          </header>
          <div className="api-detail-grid">
            <section className="panel api-content">
              <h3>연결 정보</h3>
              {!endpoint.available && (
                <p role="alert">{endpoint.unavailable_reason}</p>
              )}
              <label className="field">
                요청 주소
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <details className="help-details">
                <summary>호출 방법</summary>
                <p>접수를 중지해도 진행 중인 요청은 계속 처리됩니다.</p>
                <p>
                  JPEG, PNG, WebP 1개, 최대 20MB. 상품 카테고리는 이미지에서
                  자동 판별합니다.
                </p>
                <pre className="api-code">{`curl -X POST '${url}' \\\n  -F 'file=@product.jpg'\n\n# 202 응답의 result_url로 상태와 결과 조회\ncurl '${origin}/api/predictions/요청ID'`}</pre>
                <p>
                  status가 succeeded이면 result를 읽습니다. failed, cancelled는
                  종료 상태입니다. result의 parse_valid, schema_valid와
                  excluded_attributes를 함께 확인하세요.
                </p>
                <p>
                  중지된 API는 409, 대기열이 가득 차면 429를 반환합니다. 429
                  응답의 Retry-After 이후 다시 요청하세요.
                </p>
              </details>
            </section>
            <section className="panel api-content">
              <h3>요청 테스트</h3>
              <form
                className="api-create"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!file) return;
                  perform(async () => {
                    const body = new FormData();
                    body.append("file", file);
                    const prediction = await request<Prediction>(
                      endpoint.path,
                      { method: "POST", body },
                    );
                    setResult(prediction);
                    setHistoryPage(0);
                    setHistoryShownPage(0);
                    setHistoryTotal((n) => n + 1);
                    setHistory((h) =>
                      historyPage === 0
                        ? [
                            prediction,
                            ...h.filter((v) => v.id !== prediction.id),
                          ].slice(0, 10)
                        : [prediction],
                    );
                  });
                }}
              >
                <div className="field">
                  <span>이미지</span>
                  <div className="file-control">
                    <label className="button secondary" htmlFor="api-image">
                      이미지 선택
                    </label>
                    <span>{file?.name || "선택한 이미지 없음"}</span>
                    <input
                      id="api-image"
                      aria-label="이미지"
                      className="sr-only"
                      key={endpoint.id}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <button
                  className="button"
                  disabled={
                    busy || !file || !endpoint.enabled || !endpoint.available
                  }
                >
                  요청 보내기
                </button>
              </form>
              <p className="field-hint">
                상품 카테고리는 이미지에서 자동 판별합니다.
              </p>
            </section>
          </div>
          {result && (
            <section
              className="panel api-content prediction-result"
              aria-label="요청 결과"
              aria-live="polite"
            >
              <h3>요청 결과</h3>
              <h4>
                {result.progress?.phase === "loading" &&
                result.status === "running"
                  ? "모델 불러오는 중"
                  : states[result.status]}
              </h4>
              <p className="muted">
                요청 {result.id}
                {result.status === "queued" && result.queue_position
                  ? ` / 대기열 ${result.queue_position}번째`
                  : ""}
              </p>
              {result.error && <p role="alert">{result.error}</p>}
              {result.result && (
                <>
                  <p>
                    상품 카테고리:{" "}
                    {result.result.category ??
                      result.category ??
                      "판별하지 못함"}
                  </p>
                  <p>
                    처리 시간 {result.result.processing_seconds.toFixed(1)}초
                    (모델 로딩 포함, 큐 대기 제외)
                  </p>
                  {(!result.result.schema_valid ||
                    !result.result.parse_valid) && (
                    <p role="alert">
                      출력 형식이 올바르지 않아 결과 검토가 필요합니다.
                    </p>
                  )}
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>속성</th>
                          <th>결과</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(result.result.attributes).map(
                          ([k, v]) => (
                            <tr key={k}>
                              <td>{labels[k] || k}</td>
                              <td>
                                {result.result!.excluded_attributes.includes(k)
                                  ? "판정 제외"
                                  : Array.isArray(v)
                                    ? v.join(", ")
                                    : v}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                  <details className="help-details">
                    <summary>JSON 응답</summary>
                    <pre className="api-code">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </section>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h3>요청 이력</h3>
            </div>
            <StablePage
              rows={Math.min(10, historyTotal)}
              loading={historyLoading}
              pageKey={historyShownPage}
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>요청 ID</th>
                      <th>접수 시각</th>
                      <th>상태</th>
                      <th>처리 시간</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!historyLoading && !history.length && (
                      <tr>
                        <td colSpan={5}>요청 이력이 없습니다.</td>
                      </tr>
                    )}
                    {history.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <button
                            className="text-button"
                            disabled={historyLoading}
                            onClick={() => setResult(p)}
                          >
                            {p.id.slice(0, 8)}
                          </button>
                        </td>
                        <td>
                          {new Date(p.created_at).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                          })}
                        </td>
                        <td>{states[p.status]}</td>
                        <td>
                          {p.result
                            ? `${p.result.processing_seconds.toFixed(1)}초`
                            : "—"}
                        </td>
                        <td>
                          {active(p) && (
                            <button
                              className="button secondary"
                              disabled={busy || historyLoading}
                              onClick={() =>
                                perform(async () => {
                                  await request(`/api/jobs/${p.id}/cancel`, {
                                    method: "POST",
                                  });
                                  const updated = await request<Prediction>(
                                    p.result_url,
                                  );
                                  setHistory((h) =>
                                    h.map((v) => (v.id === p.id ? updated : v)),
                                  );
                                  setResult((v) =>
                                    v?.id === p.id ? updated : v,
                                  );
                                })
                              }
                            >
                              취소
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {historyError && !historyLoading && (
                <div role="alert" className="page-load-error">
                  <span>{historyError}</span>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => changeHistoryPage(historyPage)}
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </StablePage>
            <Pagination
              total={historyTotal}
              page={historyShownPage}
              label="API 요청"
              onPageChange={changeHistoryPage}
              disabled={historyLoading}
            />
          </section>
        </section>
      )}
    </div>
  );
}
