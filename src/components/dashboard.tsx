"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  Settings2,
  Play,
  ChevronDown,
  Database,
  Layers,
  Boxes,
  FlaskConical,
  Activity,
  Radar,
  ChevronRight,
  Plus,
  RefreshCw,
  ArrowUpRight,
  Search,
  X,
  CircleCheck,
  ArrowLeft,
  Download,
  Upload,
  Pencil,
  WandSparkles,
} from "lucide-react";
import { ModelDatasetName } from "@/components/model-dataset-name";
import { ModelPicker } from "@/components/model-picker";
import { RunElapsed } from "@/components/run-elapsed";
import { PaginatedContent } from "@/components/paginated-content";
import { SelectionCard } from "@/components/selection-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LabelEditor, type LabelSample } from "@/components/label-editor";
import { LabelStatus } from "@/components/label-status";
import { ImageUpload } from "@/components/image-upload";
import {
  DeleteDialog,
  DeletedItems,
  type DeleteTarget,
} from "@/components/data-deletion";
import { ModelApi } from "@/components/model-api";
import { AutoLabelDialog } from "@/components/auto-label-dialog";
import { displayName } from "@/lib/utils";
import { RelabelReport } from "@/components/relabel-report";
import { DriftResults, type DriftField } from "@/components/drift-results";

type Dataset = {
  created_at?: string;
  reviewed_count?: number;
  unlabeled_count?: number;
  labeled_count?: number;
  labeling_job_id?: string;
  labeling_model_id?: string;
  schema_id?: string;
  id: string;
  name: string;
  workspace_id: string;
  count: number;
  splits: Record<string, number>;
  provenance: string;
  fingerprint: string;
  kind: string;
  parent_ids: string[];
  selection?: {
    scope: string;
    available_count: number;
    selected_count: number;
    duplicate_count: number;
    by_source: Record<string, number>;
    reference_name?: string;
    before_js?: number;
    after_js?: number;
    mix?: {
      dataset_id: string;
      workspace_id: string;
      name: string;
      target_ratio: number;
      actual_ratio: number;
      selected_count: number;
      available_count: number;
    }[];
  };
};
type Workspace = {
  labeling_model_id?: string | null;
  labeling_model_name?: string | null;
  id: string;
  name: string;
  description: string;
  datasets: Dataset[];
};
type Model = {
  schema_id?: string;
  id: string;
  name: string;
  family: string;
  kind: string;
  status: string;
  available: boolean;
  training_job_id?: string;
  dataset_id?: string;
  parent_id?: string;
};
type Run = {
  dataset_name?: string;
  reference_name?: string;
  dataset_workspace_id?: string;
  reference_workspace_id?: string;
  id: string;
  status: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  request: {
    kind: string;
    dataset_id: string;
    model_id?: string;
    reference_id?: string;
    max_steps: number;
    split: string;
  };
  progress: {
    phase?: string;
    step?: number;
    total?: number;
    loss?: number;
    history?: { step: number; loss: number }[];
    elapsed_seconds?: number;
  };
  error?: string;
  result?: {
    dataset_id?: string;
    model_id?: string;
    count?: number;
    macro_attribute_accuracy?: number;
    exact_match?: number;
    parse_failures?: number;
    schema_failures?: number;
    fields?:
      Record<string, { accuracy: number | null; count: number }> | DriftField[];
    predictions?: {
      sample_id: string;
      raw: string;
      target: Record<string, unknown>;
      prediction: Record<string, unknown> | null;
      schema_valid?: boolean;
    }[];
    note?: string;
    detected?: boolean;
    image_histogram_js?: number;
    reference_count?: number;
    current_count?: number;
    threshold?: number;
    optimizer_steps?: number;
    training_sample_ids?: string[];
    loss?: number;
    policy_changed?: boolean;
  };
};
type Sample = LabelSample;
const names: Record<string, string> = {
  color_code: "색상 코드",
  fabric: "원단 유형",
  origin: "생산처",
  pattern: "무늬",
  fit: "핏",
  sleeve: "소매",
  length: "길이",
  closure: "여밈",
  details: "디테일",
  neckline: "넥라인",
  hood: "후드",
  visible_pocket: "포켓",
  cuff: "소매단",
  hem: "밑단",
  surface_texture: "표면 질감",
  graphic_location: "그래픽 위치",
  graphic_scale: "그래픽 크기",
};
const phases: Record<string, string> = {
  loading: "모델 불러오는 중",
  loading_teacher: "모델 불러오는 중",
  labeling: "이미지 레이블링",
  training: "학습 중",
  evaluating: "평가 중",
  completed: "완료",
  queued: "대기 중",
};
const states: Record<string, string> = {
  queued: "대기 중",
  running: "진행 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소",
  ready: "사용 가능",
  archived: "보관됨",
  unavailable: "파일 없음",
};
const num = (v: number | undefined) =>
  v === undefined ? "—" : v.toLocaleString("ko-KR");
const reconstructionCount = (d: Dataset) =>
  (d.splits.train || 0) + (d.splits.unassigned || 0);
const reconstructionDefaultCount = (data: Dataset[]) =>
  data.length
    ? Math.min(200, data.length * Math.min(...data.map(reconstructionCount)))
    : 200;
const pct = (v: number | undefined | null) =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const date = (v: string) =>
  new Date(v).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
async function api<T>(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const r = await fetch(
    "/api" + url,
    body === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail),
    );
  return data;
}
function Badge({
  status,
  children,
}: {
  status?: string;
  children?: ReactNode;
}) {
  return (
    <span className={`badge ${status || ""}`}>
      {children || states[status || ""] || status}
    </span>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <p>{children}</p>
    </div>
  );
}
function Panel({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="panel">
      {(title || action) && (
        <div className="panel-heading">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
function Chart({ points }: { points: { step: number; loss: number }[] }) {
  if (!points.length) return <Empty>첫 학습 스텝을 기다리고 있습니다.</Empty>;
  const min = Math.min(...points.map((p) => p.loss)) * 0.9,
    max = Math.max(...points.map((p) => p.loss)) * 1.1;
  const xy = points.map(
    (p, i) =>
      `${40 + (i / (points.length - 1 || 1)) * 640},${160 - ((p.loss - min) / (max - min || 1)) * 130}`,
  );
  return (
    <svg
      role="img"
      aria-label="학습 손실 곡선"
      viewBox="0 0 720 200"
      className="chart"
    >
      <line x1="40" y1="170" x2="700" y2="170" stroke="#dce3ec" />
      <line x1="40" y1="20" x2="40" y2="170" stroke="#dce3ec" />
      <text x="5" y="25">
        {max.toFixed(2)}
      </text>
      <text x="5" y="165">
        {min.toFixed(2)}
      </text>
      <polyline
        points={xy.join(" ")}
        fill="none"
        stroke="#3478ee"
        strokeWidth="3"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xy[i].split(",")[0]}
          cy={xy[i].split(",")[1]}
          r="3"
          fill="#3478ee"
        />
      ))}
      <text x="40" y="193">
        step 1
      </text>
      <text x="630" y="193">
        step {points.at(-1)?.step}
      </text>
    </svg>
  );
}

export default function Dashboard({ path }: { path: string[] }) {
  const router = useRouter();
  const query = useSearchParams();
  const attribute = query.get("attribute") || "";
  const attributeValue = query.get("value") || "";
  const [review, setReview] = useState("");
  const section = path[0] || "workspaces";
  const detail = path[1];
  const needsWorkspaces =
    section === "workspaces" || section === "reconstruction";
  const needsModels = [
    "models",
    "training",
    "evaluation",
    "monitoring",
  ].includes(section);
  const needsRuns =
    section === "evaluation" ||
    section === "monitoring" ||
    (section === "workspaces" && !!detail);
  const showsRun = section === "evaluation" || section === "monitoring";
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]),
    [datasets, setDatasets] = useState<Dataset[]>([]),
    [models, setModels] = useState<Model[]>([]),
    [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(""),
    [datasetId, setDatasetId] = useState(""),
    [modelId, setModelId] = useState("qwen35_2b"),
    [split, setSplit] = useState(""),
    [offset, setOffset] = useState(0);
  const [samples, setSamples] = useState<{ total: number; items: Sample[] }>({
      total: 0,
      items: [],
    }),
    [samplesLoading, setSamplesLoading] = useState(false),
    [sample, setSample] = useState<Sample | null>(null);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [moveSplit, setMoveSplit] = useState("validation");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [workspaceLabelModel, setWorkspaceLabelModel] = useState("");
  const [labelModels, setLabelModels] = useState<Model[]>([]);
  const [labelModelsLoading, setLabelModelsLoading] = useState(false);
  const [labelModelsError, setLabelModelsError] = useState("");
  const [labelingDataset, setLabelingDataset] = useState<Dataset | null>(null);
  const [newWorkspace, setNewWorkspace] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const [editWorkspaceId, setEditWorkspaceId] = useState("");
  const [budget, setBudget] = useState(200),
    [method, setMethod] = useState("balanced_mix"),
    [seed, setSeed] = useState(42),
    [parentIds, setParentIds] = useState<string[]>([]),
    [preview, setPreview] = useState<Dataset | null>(null);
  const [reconstructionReference, setReconstructionReference] = useState("");
  const [mixWeights, setMixWeights] = useState<Record<string, number>>({});
  const [steps, setSteps] = useState(20),
    [lr, setLr] = useState(0.00002),
    [evalSplit, setEvalSplit] = useState("test"),
    [reference, setReference] = useState(""),
    [threshold, setThreshold] = useState(0.1),
    [selectedRun, setSelectedRun] = useState(""),
    [logs, setLogs] = useState("");
  const [runDetail, setRunDetail] = useState<Run | null>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNewWorkspace(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => {
    if (!newWorkspace) return;
    let alive = true;
    setLabelModelsLoading(true);
    setLabelModelsError("");
    const data = datasets.find((d) => d.workspace_id === editWorkspaceId);
    api<Model[]>(
      "/labeling-models" +
        (data
          ? `?schema_id=${encodeURIComponent(data.schema_id || "visual-v1")}`
          : ""),
    )
      .then((items) => {
        if (alive) setLabelModels(items);
      })
      .catch((e) => {
        if (alive) setLabelModelsError(e.message);
      })
      .finally(() => {
        if (alive) setLabelModelsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [newWorkspace, editWorkspaceId, datasets]);
  const refresh = useCallback(async () => {
    const [w, d, m, j] = await Promise.all([
      needsWorkspaces ? api<Workspace[]>("/workspaces") : Promise.resolve(null),
      api<Dataset[]>("/datasets?current=true"),
      needsModels
        ? api<Model[]>("/models?summary=true")
        : Promise.resolve(null),
      needsRuns ? api<Run[]>("/jobs?summary=true") : Promise.resolve(null),
    ]);
    if (w) setWorkspaces(w);
    setDatasets(d);
    if (m) setModels(m);
    if (j) setRuns(j);
    setLoading(false);
  }, [needsWorkspaces, needsModels, needsRuns]);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    const go = async () => {
      if (inFlight) return;
      clearTimeout(timer);
      inFlight = true;
      try {
        if (!document.hidden) await refresh();
      } catch (e) {
        if (alive) {
          setError(
            e instanceof Error ? e.message : "목록 조회에 실패했습니다.",
          );
          setLoading(false);
        }
      } finally {
        inFlight = false;
        if (alive) timer = setTimeout(go, needsRuns ? 4000 : 30000);
      }
    };
    const onVisible = () => {
      if (!document.hidden) void go();
    };
    document.addEventListener("visibilitychange", onVisible);
    go();
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, needsRuns]);
  useEffect(() => {
    if ((section === "training" || section === "evaluation") && detail)
      setModelId(detail);
  }, [section, detail]);
  useEffect(() => {
    setSearch("");
    setReview("");
    setSplit("");
    setOffset(0);
    setSample(null);
    setSelectedRun("");
    setPreview(null);
  }, [section, detail]);
  const sourceWorkspaces = query.get("sources") || "";
  const appliedSources = useRef("");
  useEffect(() => {
    if (section !== "reconstruction" || !sourceWorkspaces) {
      appliedSources.current = "";
      return;
    }
    if (datasets.length && appliedSources.current !== sourceWorkspaces) {
      appliedSources.current = sourceWorkspaces;
      const wanted = sourceWorkspaces.split(",");
      const sources = datasets.filter(
        (d) => wanted.includes(d.workspace_id) && reconstructionCount(d) > 0,
      );
      setParentIds(sources.map((d) => d.id));
      setBudget(reconstructionDefaultCount(sources));
      setMixWeights({});
    }
  }, [section, sourceWorkspaces, datasets]);
  const workspace = workspaces.find((w) => w.id === detail);
  const workspaceDatasets = datasets
    .filter((d) => d.workspace_id === detail)
    .sort(
      (a, b) =>
        (b.created_at || "").localeCompare(a.created_at || "") ||
        b.id.localeCompare(a.id),
    );
  const latestDataset = workspaceDatasets[0];
  const currentDataset =
    section === "workspaces" && detail
      ? (sample ? editingDataset : undefined) || latestDataset
      : datasets.find((d) => d.id === datasetId) || datasets[0];
  const [editorIds, setEditorIds] = useState<string[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState("");
  const editorRequest = useRef(0);
  const editorMoving = useRef(false);
  function closeSample() {
    editorRequest.current += 1;
    editorMoving.current = false;
    setSample(null);
    setEditorLoading(false);
  }
  async function openSample(row: Sample) {
    if (!currentDataset) return;
    const request = ++editorRequest.current;
    setDatasetId(currentDataset.id);
    setEditingDataset(currentDataset);
    setSample(row);
    setEditorIds([]);
    setEditorError("");
    setEditorLoading(true);
    try {
      const result = await api<{ ids: string[] }>(
        `/datasets/${currentDataset.id}/samples?ids_only=true&q=${encodeURIComponent(search)}${split ? "&split=" + split : ""}${review ? "&review=" + review : ""}${attribute ? "&attribute=" + encodeURIComponent(attribute) + "&value=" + encodeURIComponent(attributeValue) : ""}`,
      );
      if (editorRequest.current === request) setEditorIds(result.ids);
    } catch (e) {
      if (editorRequest.current === request)
        setEditorError((e as Error).message);
    } finally {
      if (editorRequest.current === request) setEditorLoading(false);
    }
  }
  async function moveSample(direction: number) {
    if (!sample || !currentDataset || editorMoving.current || editorLoading)
      return;
    const index = editorIds.indexOf(sample.id);
    const id = index >= 0 ? editorIds[index + direction] : undefined;
    if (!id) return;
    const request = ++editorRequest.current;
    editorMoving.current = true;
    setEditorLoading(true);
    setEditorError("");
    try {
      const row = await api<Sample>(
        `/datasets/${currentDataset.id}/samples/${encodeURIComponent(id)}`,
      );
      if (editorRequest.current === request) setSample(row);
    } catch (e) {
      if (editorRequest.current === request)
        setEditorError((e as Error).message);
    } finally {
      if (editorRequest.current === request) {
        setEditorLoading(false);
        editorMoving.current = false;
      }
    }
  }
  useEffect(() => {
    if (section !== "workspaces" || !detail || !currentDataset) return;
    let alive = true;
    setSamplesLoading(true);
    api<{ total: number; items: Sample[] }>(
      `/datasets/${currentDataset.id}/samples?limit=24&offset=${offset}&q=${encodeURIComponent(search)}${split ? "&split=" + split : ""}${review ? "&review=" + review : ""}${attribute ? "&attribute=" + encodeURIComponent(attribute) + "&value=" + encodeURIComponent(attributeValue) : ""}`,
    )
      .then((v) => {
        if (alive) {
          setSamples(v);
          if (offset > 0 && offset >= v.total)
            setOffset(Math.max(0, Math.floor((v.total - 1) / 24) * 24));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (alive) setSamplesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [
    section,
    detail,
    currentDataset?.id,
    offset,
    search,
    split,
    review,
    attribute,
    attributeValue,
  ]);
  useEffect(() => {
    setSelectedSamples([]);
  }, [currentDataset?.id, search, split, review, attribute, attributeValue]);
  const labelingRun = runs.find(
    (r) =>
      r.request.kind === "labeling" &&
      r.request.dataset_id === currentDataset?.id,
  );
  const labelingResult = datasets.find(
    (d) => d.labeling_job_id === labelingRun?.id && d.labeling_job_id,
  );
  const labelingBusy =
    !!labelingRun && ["queued", "running"].includes(labelingRun.status);
  async function act(fn: () => Promise<unknown>, message = "저장했습니다.") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const trainingSettingsRef = useRef<HTMLDialogElement>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState("all");
  const [workspaceSort, setWorkspaceSort] = useState("default");
  const modelSearch = query.get("q") || "";
  const modelKind = ["base", "lora"].includes(query.get("type") || "")
    ? query.get("type")!
    : "all";
  const requestedModelPage = Number(query.get("page") || "1");
  const modelPage =
    Number.isSafeInteger(requestedModelPage) && requestedModelPage > 0
      ? requestedModelPage - 1
      : 0;
  const modelListParams = new URLSearchParams();
  if (modelSearch) modelListParams.set("q", modelSearch);
  if (modelKind !== "all") modelListParams.set("type", modelKind);
  if (modelPage) modelListParams.set("page", String(modelPage + 1));
  const modelListSuffix = modelListParams.size
    ? "?" + modelListParams.toString()
    : "";
  function changeModelList(change: {
    search?: string;
    kind?: string;
    page?: number;
  }) {
    const params = new URLSearchParams(modelListParams);
    if (change.search !== undefined) {
      if (change.search) params.set("q", change.search);
      else params.delete("q");
    }
    if (change.kind !== undefined) {
      if (change.kind !== "all") params.set("type", change.kind);
      else params.delete("type");
    }
    const page = change.page ?? 0;
    if (page) params.set("page", String(page + 1));
    else params.delete("page");
    window.history.replaceState(
      null,
      "",
      "/ko/models" + (params.size ? "?" + params.toString() : ""),
    );
  }
  const [draftTraining, setDraftTraining] = useState({
    steps: 20,
    lr: 0.00002,
    seed: 42,
  });
  function openTrainingSettings() {
    setDraftTraining({ steps, lr, seed });
    trainingSettingsRef.current?.showModal();
  }
  const route = section === "monitoring" ? `monitoring/${detail}` : section;
  const nav = [
    {
      group: "데이터",
      items: [
        ["workspaces", "워크스페이스", Database],
        ["reconstruction", "데이터 재구성", Layers],
      ],
    },
    {
      group: "모델",
      items: [
        ["models", "모델 목록", Boxes],
        ["training", "학습", FlaskConical],
        ["evaluation", "모델 평가", CircleCheck],
        ["model-api", "모델 API", Boxes],
      ],
    },
    {
      group: "모니터링",
      items: [
        ["monitoring/training", "학습 진행 상태", Activity],
        ["monitoring/drift", "드리프트 탐지", Radar],
      ],
    },
  ] as const;
  const title =
    section === "model-api"
      ? "모델 API"
      : section === "workspaces"
        ? detail
          ? displayName(workspace?.name) || "워크스페이스"
          : "워크스페이스"
        : section === "models"
          ? detail
            ? "모델 상세"
            : "모델 목록"
          : section === "reconstruction"
            ? "데이터 재구성"
            : section === "training"
              ? "모델 학습"
              : section === "evaluation"
                ? "모델 평가"
                : detail === "drift"
                  ? "드리프트 탐지"
                  : "학습 진행 상태";
  const usableModels = models.filter(
    (m) =>
      m.status === "ready" &&
      m.available &&
      (m.kind === "base" ||
        (m.schema_id || "visual-v1") ===
          (currentDataset?.schema_id || "visual-v1")),
  );
  const selectedModel =
    usableModels.find((m) => m.id === modelId) ||
    (!detail ? usableModels[0] : undefined);
  const modelOptions = models
    .filter(
      (m) =>
        m.status === "ready" &&
        (m.kind === "base" ||
          (m.schema_id || "visual-v1") ===
            (currentDataset?.schema_id || "visual-v1")),
    )
    .map((m) => ({
      id: m.id,
      name: displayName(m.name),
      disabled: !m.available,
    }));
  const datasetOptions = datasets.map((d) => (
    <option key={d.id} value={d.id}>
      {displayName(d.name)} ({num(d.count)}개)
      {d.unlabeled_count ? ` / 미레이블 ${d.unlabeled_count}개` : ""}
    </option>
  ));
  const runKind =
    section === "evaluation"
      ? "evaluation"
      : section === "monitoring" && detail === "drift"
        ? "drift"
        : "training";
  const visibleRuns = runs.filter(
    (r) =>
      r.request.kind === runKind ||
      (runKind === "training" && r.request.kind === "labeling"),
  );
  const runSummary =
    visibleRuns.find((r) => r.id === selectedRun) || visibleRuns[0];
  const activeRun =
    runDetail?.id === runSummary?.id && runDetail?.status === runSummary?.status
      ? runDetail
      : runSummary;
  useEffect(() => {
    if (!showsRun || !runSummary) return;
    let alive = true;
    api<Run>(`/jobs/${runSummary.id}`)
      .then((v) => {
        if (alive) setRunDetail(v);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    if (section === "monitoring" && detail === "training") {
      setLogs("");
      api<{ text: string }>(`/jobs/${runSummary.id}/logs`)
        .then((v) => {
          if (alive) setLogs(v.text);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [
    showsRun,
    section,
    detail,
    runSummary?.id,
    runSummary?.progress?.step,
    runSummary?.status,
  ]);
  const reconstructionInitialized = useRef(false);
  useEffect(() => {
    if (section !== "reconstruction") {
      reconstructionInitialized.current = false;
      return;
    }
    if (
      !datasets.length ||
      sourceWorkspaces ||
      reconstructionInitialized.current
    )
      return;
    reconstructionInitialized.current = true;
    const eligible = datasets.filter(
      (d) => !d.unlabeled_count && reconstructionCount(d) > 0,
    );
    const schema =
      eligible.find((d) => d.schema_id?.startsWith("bkave-"))?.schema_id ||
      eligible[0]?.schema_id;
    const sources = eligible.filter((d) => d.schema_id === schema);
    setParentIds(sources.map((d) => d.id));
    setBudget(reconstructionDefaultCount(sources));
    setMixWeights({});
  }, [section, datasets, sourceWorkspaces]);
  const reconstructionSources = datasets.filter((d) =>
    parentIds.includes(d.id),
  );
  const reconstructionAvailable = reconstructionSources.reduce(
    (sum, d) => sum + reconstructionCount(d),
    0,
  );
  const reconstructionReferenceId =
    reconstructionSources.find((d) => d.id === reconstructionReference)?.id ||
    reconstructionSources[0]?.id ||
    "";
  const reconstructionName = (d: { workspace_id: string; name: string }) =>
    displayName(
      workspaces.find((w) => w.id === d.workspace_id)?.name || d.name,
    );
  const rawMixWeights = reconstructionSources.map((d) => mixWeights[d.id] ?? 1);
  const mixTotal = rawMixWeights.reduce((sum, w) => sum + w, 0) || 1;
  const exactUnits = rawMixWeights.map((w) => (10000 * w) / mixTotal);
  const mixUnits = exactUnits.map(Math.floor);
  const remainderOrder = exactUnits
    .map((n, i) => i)
    .sort(
      (a, b) => exactUnits[b] - mixUnits[b] - (exactUnits[a] - mixUnits[a]),
    );
  for (const i of remainderOrder.slice(
    0,
    10000 - mixUnits.reduce((sum, n) => sum + n, 0),
  ))
    mixUnits[i]++;
  const reconstructionWeights = Object.fromEntries(
    reconstructionSources.map((d, i) => [d.id, mixUnits[i] / 100]),
  );
  function changeMixWeight(id: string, value: number) {
    const percent = Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : 0;
    const others = reconstructionSources.filter((d) => d.id !== id);
    const total = others.reduce(
      (sum, d) => sum + reconstructionWeights[d.id],
      0,
    );
    setMixWeights(
      Object.fromEntries(
        reconstructionSources.map((d) => [
          d.id,
          d.id === id
            ? percent
            : (100 - percent) *
              (total ? reconstructionWeights[d.id] / total : 1 / others.length),
        ]),
      ),
    );
    setPreview(null);
  }
  const bodyRecon = () => ({
    name: name.trim(),
    dataset_ids: parentIds,
    data_count: method === "merge" ? undefined : budget,
    reference_id:
      method === "distribution" ? reconstructionReferenceId : undefined,
    dataset_weights:
      method === "balanced_mix" ? reconstructionWeights : undefined,
    method,
    seed,
  });
  async function submit(kind: string) {
    await act(async () => {
      if (kind !== "drift" && !selectedModel)
        throw new Error("사용 가능한 모델을 선택하세요.");
      const j = await api<Run>("/jobs", {
        kind,
        dataset_id: currentDataset?.id,
        model_id: kind === "drift" ? undefined : selectedModel?.id,
        reference_id:
          kind === "drift"
            ? reference || datasets.find((d) => d.id !== currentDataset?.id)?.id
            : undefined,
        max_steps: steps,
        learning_rate: lr,
        split: evalSplit,
        threshold,
        seed,
      });
      setSelectedRun(j.id);
      if (kind === "training") router.push("/ko/monitoring/training");
    }, "작업을 시작했습니다.");
  }
  function runList() {
    return (
      <Panel
        title="실행 이력"
        action={<span className="muted">{visibleRuns.length}개</span>}
      >
        {!visibleRuns.length ? (
          <Empty>아직 실행한 작업이 없습니다.</Empty>
        ) : (
          <PaginatedContent key={route} items={visibleRuns} label="실행 이력">
            {(pageRuns) => (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>작업</th>
                      <th>데이터셋</th>
                      <th>생성 시각 (KST)</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRuns.map((j) => (
                      <tr
                        key={j.id}
                        className={activeRun?.id === j.id ? "selected" : ""}
                      >
                        <td>
                          <button
                            className="text-button"
                            onClick={() => setSelectedRun(j.id)}
                          >
                            {j.request.kind === "labeling" ? "레이블링 " : ""}
                            {j.id.slice(0, 8)}
                          </button>
                        </td>
                        <td>
                          {displayName(
                            datasets.find((d) => d.id === j.request.dataset_id)
                              ?.name,
                          ) ||
                            displayName(j.dataset_name) ||
                            "삭제된 데이터"}
                        </td>
                        <td>{date(j.created_at)}</td>
                        <td>
                          <Badge status={j.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PaginatedContent>
        )}
      </Panel>
    );
  }
  function runHeader() {
    return (
      activeRun && (
        <div className="run-head">
          <div>
            <strong>실행 {activeRun.id.slice(0, 8)}</strong>{" "}
            <Badge status={activeRun.status} />
            <div className="run-meta">
              {activeRun.request.kind === "drift" ? (
                <span>
                  {displayName(
                    datasets.find(
                      (d) => d.id === activeRun.request.reference_id,
                    )?.name || activeRun.reference_name,
                  )}{" "}
                  →{" "}
                  {displayName(
                    datasets.find((d) => d.id === activeRun.request.dataset_id)
                      ?.name || activeRun.dataset_name,
                  )}
                </span>
              ) : (
                <span>
                  {activeRun.request.kind === "labeling"
                    ? `${displayName(models.find((m) => m.id === activeRun.request.model_id)?.name) || "Gemma-4-12B"} 자동 레이블링`
                    : displayName(
                        models.find((m) => m.id === activeRun.request.model_id)
                          ?.name,
                      )}
                </span>
              )}
              <time>{date(activeRun.created_at)}</time>
            </div>
          </div>
          {["queued", "running"].includes(activeRun.status) && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                act(
                  () => api(`/jobs/${activeRun.id}/cancel`, {}),
                  "취소 요청을 보냈습니다.",
                )
              }
            >
              실행 취소
            </button>
          )}
        </div>
      )
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/ko/workspaces" className="brand">
          <span className="brand-symbol">
            <Layers size={22} />
          </span>
          DataDrift
        </Link>
        <nav>
          {nav.map((group) => (
            <details className="nav-group" key={group.group} open>
              <summary className="nav-label">
                {group.group === "데이터" ? (
                  <Database size={18} />
                ) : group.group === "모델" ? (
                  <Boxes size={18} />
                ) : (
                  <Activity size={18} />
                )}
                <span>{group.group}</span>
                <ChevronDown size={16} />
              </summary>
              <div className="nav-children">
                {group.items.map(([url, label]) => (
                  <Link
                    className={`nav-item ${route === url ? "active" : ""}`}
                    key={url}
                    href={
                      url === "models" && section === "models"
                        ? "/ko/models" + modelListSuffix
                        : "/ko/" + url
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </nav>
      </aside>
      <div className="main-shell">
        <main
          className={`page-${section} ${detail ? "detail-page" : "list-page"}`}
        >
          {section === "workspaces" && detail && (
            <Link className="back" href="/ko/workspaces">
              <ArrowLeft size={16} />
              전체 워크스페이스
            </Link>
          )}
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
            </div>
            <div
              className={`page-actions ${section === "workspaces" && detail ? "dataset-current" : ""}`}
              data-dataset-id={
                section === "workspaces" && detail
                  ? currentDataset?.id || ""
                  : undefined
              }
            >
              {section === "workspaces" && !detail && (
                <div className="actions">
                  <button
                    className="button secondary"
                    disabled={!workspaces.length}
                    onClick={() => setUploadOpen(true)}
                  >
                    이미지 업로드
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      setWorkspaceLabelModel("");
                      setEditWorkspaceId("");
                      setName("");
                      setDescription("");
                      setNewWorkspace(true);
                    }}
                  >
                    <Plus size={17} />
                    워크스페이스 만들기
                  </button>
                </div>
              )}
              {section === "models" && !detail && (
                <Link className="button" href="/ko/training">
                  <Plus size={16} />
                  모델 학습
                </Link>
              )}
              {section === "training" && (
                <>
                  <button
                    className="button secondary"
                    onClick={openTrainingSettings}
                    disabled={loading}
                  >
                    <Settings2 size={16} />
                    학습 설정
                  </button>
                  <button
                    className="button"
                    form="training-form"
                    type="submit"
                    disabled={busy || !currentDataset || !selectedModel}
                  >
                    <Play size={16} />
                    학습 시작
                  </button>
                </>
              )}

              {section === "workspaces" && detail && workspace && (
                <button
                  className="button secondary"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload size={16} />
                  이미지 업로드
                </button>
              )}
              {section === "workspaces" && detail && workspace && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setWorkspaceLabelModel(workspace.labeling_model_id || "");
                    setEditWorkspaceId(workspace.id);
                    setName(workspace.name);
                    setDescription(workspace.description);
                    setNewWorkspace(true);
                  }}
                >
                  <Pencil size={16} />
                  워크스페이스 수정
                </button>
              )}
              {section === "workspaces" && detail && workspace && (
                <>
                  <button
                    className="button secondary"
                    disabled={busy || !currentDataset?.count || labelingBusy}
                    title={
                      !currentDataset?.count
                        ? "이미지를 업로드하세요."
                        : labelingBusy
                          ? "자동 레이블링이 진행 중입니다."
                          : undefined
                    }
                    onClick={() =>
                      currentDataset && setLabelingDataset(currentDataset)
                    }
                  >
                    <WandSparkles size={16} />
                    자동 레이블링
                  </button>
                  <details
                    className="action-menu"
                    onBlur={(e) => {
                      if (
                        !e.currentTarget.contains(
                          e.relatedTarget as Node | null,
                        )
                      )
                        e.currentTarget.open = false;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.currentTarget.open = false;
                        e.currentTarget.querySelector("summary")?.focus();
                      }
                    }}
                  >
                    <summary className="button secondary">
                      데이터 작업
                      <ChevronDown size={16} />
                    </summary>
                    <div className="action-menu-items">
                      <button
                        className="button secondary"
                        disabled={
                          samplesLoading ||
                          !currentDataset ||
                          !samples.items.length
                        }
                        onClick={(e) => {
                          e.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          openSample(samples.items[0]);
                        }}
                      >
                        <CircleCheck size={16} />
                        레이블 검토
                      </button>
                      <Link
                        className="button secondary"
                        href="/ko/reconstruction"
                      >
                        <Layers size={16} />
                        재구성
                      </Link>
                      {currentDataset && (
                        <a
                          className="button secondary"
                          href={`/api/datasets/${currentDataset.id}/export`}
                        >
                          <Download size={16} />
                          레이블 내보내기
                        </a>
                      )}
                      <hr />
                      {currentDataset && (
                        <button
                          className="button secondary danger-text"
                          onClick={(e) => {
                            e.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            setDeleteTarget({
                              kind: "dataset",
                              id: currentDataset.id,
                            });
                          }}
                        >
                          전체 데이터 삭제
                        </button>
                      )}
                      <button
                        className="button secondary danger-text"
                        onClick={(e) => {
                          e.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          setDeleteTarget({
                            kind: "workspace",
                            id: workspace.id,
                          });
                        }}
                      >
                        워크스페이스 삭제
                      </button>
                    </div>
                  </details>
                </>
              )}
              {section === "workspaces" && !detail && (
                <button
                  className="button secondary"
                  onClick={() => setTrashOpen(true)}
                >
                  삭제 목록
                </button>
              )}
              <button
                className="button secondary"
                aria-label="새로고침"
                onClick={() => act(async () => {}, "새로고침했습니다.")}
                disabled={busy}
              >
                <RefreshCw size={16} />
                새로고침
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button onClick={() => setError("")} aria-label="오류 닫기">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
              <button onClick={() => setNotice("")} aria-label="알림 닫기">
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading">데이터를 불러오는 중입니다…</div>
          ) : (
            <>
              {section === "workspaces" && !detail && (
                <>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        placeholder="워크스페이스 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <select
                      aria-label="워크스페이스 상태"
                      value={workspaceStatus}
                      onChange={(e) => setWorkspaceStatus(e.target.value)}
                    >
                      <option value="all">상태: 전체</option>
                      <option value="incomplete">레이블 진행 중</option>
                      <option value="complete">레이블 완료</option>
                      <option value="empty">이미지 없음</option>
                    </select>
                    <label>
                      정렬{" "}
                      <select
                        aria-label="워크스페이스 정렬"
                        value={workspaceSort}
                        onChange={(e) => setWorkspaceSort(e.target.value)}
                      >
                        <option value="default">기본 순서</option>
                        <option value="name">이름순</option>
                        <option value="progress">레이블 진행률순</option>
                      </select>
                    </label>
                  </div>
                  <div className="workspace-grid">
                    {workspaces
                      .filter((w) => {
                        const d = w.datasets[0];
                        return (
                          workspaceStatus === "all" ||
                          (workspaceStatus === "empty"
                            ? !d?.count
                            : workspaceStatus === "complete"
                              ? !!d?.count && (d.labeled_count || 0) >= d.count
                              : !!d?.count && (d.labeled_count || 0) < d.count)
                        );
                      })
                      .filter((w) =>
                        w.name.toLowerCase().includes(search.toLowerCase()),
                      )
                      .sort((a, b) =>
                        workspaceSort === "name"
                          ? a.name.localeCompare(b.name)
                          : workspaceSort === "progress"
                            ? (b.datasets[0]?.labeled_count || 0) /
                                (b.datasets[0]?.count || 1) -
                              (a.datasets[0]?.labeled_count || 0) /
                                (a.datasets[0]?.count || 1)
                            : 0,
                      )
                      .map((w) => (
                        <Link
                          href={"/ko/workspaces/" + w.id}
                          key={w.id}
                          className="workspace-card"
                        >
                          <h2>{displayName(w.name)}</h2>
                          {w.description && <p>{displayName(w.description)}</p>}
                          <div className="workspace-model">
                            레이블링 모델{" "}
                            <strong>
                              {displayName(w.labeling_model_name || "미설정")}
                            </strong>
                            <ChevronRight size={16} />
                          </div>
                          <div className="workspace-progress">
                            <div>
                              <span>레이블 진행률</span>
                              <strong>
                                {num(w.datasets[0]?.labeled_count || 0)} /{" "}
                                {num(w.datasets[0]?.count || 0)}
                              </strong>
                            </div>
                            <progress
                              aria-label={`${w.name} 레이블 진행률`}
                              value={w.datasets[0]?.labeled_count || 0}
                              max={w.datasets[0]?.count || 1}
                            />
                          </div>
                        </Link>
                      ))}
                  </div>
                  {!workspaces.length && (
                    <Empty>
                      워크스페이스를 만들거나 레이블 데이터를 가져오세요.
                    </Empty>
                  )}
                </>
              )}
              {section === "workspaces" && detail && (
                <>
                  {!workspace ? (
                    <Empty>워크스페이스를 찾을 수 없습니다.</Empty>
                  ) : (
                    <>
                      {currentDataset && labelingRun && (
                        <div className="workspace-label-status">
                          {labelingRun && (
                            <span>
                              자동 레이블링 {states[labelingRun.status]}
                              {labelingRun.status === "running"
                                ? ["loading", "loading_teacher"].includes(
                                    labelingRun.progress.phase || "loading",
                                  )
                                  ? " (모델 불러오는 중)"
                                  : ` ${labelingRun.progress.step || 0} / ${labelingRun.progress.total || currentDataset.count}`
                                : ""}
                            </span>
                          )}
                          {labelingBusy && (
                            <Link
                              className="text-button"
                              href="/ko/monitoring/training"
                            >
                              진행 상태 보기
                            </Link>
                          )}
                          {labelingRun?.status === "failed" && (
                            <Link
                              className="text-button"
                              href="/ko/monitoring/training"
                            >
                              실행 로그 확인
                            </Link>
                          )}
                          {labelingResult && (
                            <button
                              className="text-button"
                              onClick={() => {
                                setDatasetId(labelingResult.id);
                                setOffset(0);
                                setSplit("");
                                setSearch("");
                              }}
                            >
                              레이블 결과 보기
                            </button>
                          )}
                        </div>
                      )}
                      {currentDataset ? (
                        <>
                          <div className="tabs">
                            <button
                              aria-label="전체"
                              className={!split ? "chosen" : ""}
                              onClick={() => {
                                setSplit("");
                                setOffset(0);
                              }}
                            >
                              전체 <span>{num(currentDataset.count)}</span>
                            </button>
                            {[
                              ...(currentDataset.splits.unassigned ||
                              split === "unassigned"
                                ? [["unassigned", "미지정"]]
                                : []),
                              ["train", "학습"],
                              ["validation", "검증"],
                              ["test", "테스트"],
                            ].map(([v, l]) => (
                              <button
                                key={v}
                                aria-label={l}
                                className={split === v ? "chosen" : ""}
                                onClick={() => {
                                  setSplit(v);
                                  setOffset(0);
                                }}
                              >
                                {l}{" "}
                                <span>
                                  {num(currentDataset.splits[v] || 0)}
                                </span>
                              </button>
                            ))}
                          </div>
                          {attribute && (
                            <p className="filter-summary">
                              {names[attribute] || attribute}: {attributeValue}{" "}
                              <Link href={`/ko/workspaces/${detail}`}>
                                필터 해제
                              </Link>
                            </p>
                          )}
                          <div className="toolbar">
                            <select
                              className="review-filter"
                              aria-label="레이블 검토 상태"
                              value={review}
                              onChange={(e) => {
                                setReview(e.target.value);
                                setOffset(0);
                              }}
                            >
                              <option value="">전체 검토 상태</option>
                              <option value="pending">
                                검토 대기 (
                                {num(
                                  (currentDataset.labeled_count || 0) -
                                    (currentDataset.reviewed_count || 0),
                                )}
                                )
                              </option>
                              <option value="verified">
                                검토 완료 (
                                {num(currentDataset.reviewed_count || 0)})
                              </option>
                              <option value="unlabeled">
                                레이블 없음 (
                                {num(currentDataset.unlabeled_count || 0)})
                              </option>
                            </select>
                            <div className="search">
                              <Search size={17} />
                              <input
                                placeholder="상품 ID 또는 속성 검색"
                                value={search}
                                onChange={(e) => {
                                  setSearch(e.target.value);
                                  setOffset(0);
                                }}
                              />
                            </div>
                            <div className="actions">
                              <span className="muted">
                                {num(samples.total)}개 검색됨
                              </span>
                            </div>
                          </div>
                          <div className="selection-toolbar">
                            <label>
                              <input
                                type="checkbox"
                                disabled={
                                  busy ||
                                  samplesLoading ||
                                  !samples.items.length
                                }
                                checked={
                                  !!samples.items.length &&
                                  samples.items.every((r) =>
                                    selectedSamples.includes(r.id),
                                  )
                                }
                                onChange={(e) =>
                                  setSelectedSamples((ids) =>
                                    e.target.checked
                                      ? [
                                          ...new Set([
                                            ...ids,
                                            ...samples.items.map((r) => r.id),
                                          ]),
                                        ]
                                      : ids.filter(
                                          (id) =>
                                            !samples.items.some(
                                              (r) => r.id === id,
                                            ),
                                        ),
                                  )
                                }
                              />
                              현재 페이지 전체 선택
                            </label>
                            <span>{selectedSamples.length}개 선택</span>
                            <button
                              className={`button secondary selection-clear ${!selectedSamples.length ? "is-inactive" : ""}`}
                              aria-hidden={!selectedSamples.length}
                              disabled={busy || !selectedSamples.length}
                              onClick={() => setSelectedSamples([])}
                            >
                              선택 해제
                            </button>
                            <div
                              className={`actions selection-actions ${!selectedSamples.length ? "is-inactive" : ""}`}
                              aria-hidden={!selectedSamples.length}
                            >
                              <select
                                aria-label="이동할 데이터 구분"
                                value={moveSplit}
                                disabled={busy}
                                onChange={(e) => setMoveSplit(e.target.value)}
                              >
                                <option value="unassigned">
                                  미지정 데이터
                                </option>
                                <option value="train">학습 데이터</option>
                                <option value="validation">검증 데이터</option>
                                <option value="test">테스트 데이터</option>
                              </select>
                              <button
                                className="button secondary"
                                disabled={
                                  busy ||
                                  samplesLoading ||
                                  !selectedSamples.length
                                }
                                onClick={() =>
                                  void act(async () => {
                                    const result = await api<{
                                      dataset: Dataset;
                                      changed_count: number;
                                    }>(
                                      `/datasets/${currentDataset.id}/samples/split`,
                                      {
                                        sample_ids: selectedSamples,
                                        split: moveSplit,
                                      },
                                    );
                                    setDatasetId(result.dataset.id);
                                    setDatasets((items) => [
                                      result.dataset,
                                      ...items.filter(
                                        (d) =>
                                          d.workspace_id !==
                                          result.dataset.workspace_id,
                                      ),
                                    ]);
                                    setSelectedSamples([]);
                                    setOffset(0);
                                  }, "데이터 구분을 변경했습니다.")
                                }
                              >
                                선택 이동
                              </button>
                              <button
                                className="button secondary danger-text"
                                disabled={
                                  busy ||
                                  samplesLoading ||
                                  !selectedSamples.length
                                }
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: "samples",
                                    id: currentDataset.id,
                                    sample_ids: selectedSamples,
                                  })
                                }
                              >
                                선택 삭제
                              </button>
                            </div>
                          </div>
                          <div
                            className="sample-page"
                            aria-busy={samplesLoading}
                          >
                            {samplesLoading && (
                              <span className="page-loading" role="status">
                                이미지를 불러오는 중…
                              </span>
                            )}
                            <div className="sample-grid">
                              {samples.items.map((r) => (
                                <div
                                  className={`sample-item ${selectedSamples.includes(r.id) ? "is-selected" : ""}`}
                                  key={r.id}
                                >
                                  <div className="sample-card">
                                    <label className="sample-select">
                                      <input
                                        className="sample-checkbox"
                                        type="checkbox"
                                        aria-label={`${r.filename || r.product_id} 선택`}
                                        checked={selectedSamples.includes(r.id)}
                                        disabled={busy || samplesLoading}
                                        onChange={(e) =>
                                          setSelectedSamples((ids) =>
                                            e.target.checked
                                              ? [...new Set([...ids, r.id])]
                                              : ids.filter((id) => id !== r.id),
                                          )
                                        }
                                      />
                                      <img
                                        src={`/api/datasets/${currentDataset.id}/images/${r.id}`}
                                        alt={r.filename || r.product_id}
                                        loading="lazy"
                                      />
                                    </label>
                                    <button
                                      className="sample-review"
                                      disabled={busy || samplesLoading}
                                      aria-label={`${r.filename || r.product_id} 레이블 검토`}
                                      onClick={() => openSample(r)}
                                    >
                                      <LabelStatus sample={r} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {Array.from(
                                {
                                  length: Math.max(
                                    0,
                                    Math.min(
                                      24,
                                      samples.total ||
                                        (samplesLoading ? 24 : 0),
                                    ) - samples.items.length,
                                  ),
                                },
                                (_, index) => (
                                  <div
                                    key={`empty-${index}`}
                                    className="sample-placeholder"
                                    aria-hidden="true"
                                  />
                                ),
                              )}
                            </div>
                            {!samplesLoading && !samples.total && (
                              <Empty>검색 조건에 맞는 데이터가 없습니다.</Empty>
                            )}
                          </div>
                          <div className="pagination">
                            <button
                              className="button secondary"
                              disabled={samplesLoading || offset === 0}
                              onClick={() =>
                                setOffset(Math.max(0, offset - 24))
                              }
                            >
                              이전
                            </button>
                            <span>
                              {Math.floor(offset / 24) + 1} /{" "}
                              {Math.max(1, Math.ceil(samples.total / 24))}
                            </span>
                            <button
                              className="button secondary"
                              disabled={
                                samplesLoading || offset + 24 >= samples.total
                              }
                              onClick={() => setOffset(offset + 24)}
                            >
                              다음
                            </button>
                          </div>
                        </>
                      ) : (
                        <Empty>
                          이미지 업로드로 데이터를 추가하세요. 업로드 후 자동
                          레이블링하거나 직접 레이블을 작성할 수 있습니다.
                        </Empty>
                      )}
                    </>
                  )}
                </>
              )}
              {section === "reconstruction" && (
                <div className="two-col">
                  <Panel title="원본 및 저장 위치">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(async () => {
                          const d = await api<Dataset>(
                            "/reconstructions",
                            bodyRecon(),
                          );
                          router.push("/ko/workspaces/" + d.workspace_id);
                        }, "새 워크스페이스에 데이터를 저장했습니다.");
                      }}
                    >
                      <label className="field">
                        저장할 워크스페이스 이름
                        <Input
                          required
                          maxLength={100}
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setPreview(null);
                          }}
                          placeholder="예: 패션 속성 학습 데이터"
                        />
                      </label>
                      <fieldset>
                        <legend>원본 워크스페이스</legend>
                        <p className="field-hint">
                          학습 데이터와 미지정 데이터를 사용하며, 검증 및
                          테스트는 제외합니다.
                        </p>
                        {datasets.map((d) => (
                          <label className="check-row" key={d.id}>
                            <input
                              type="checkbox"
                              checked={parentIds.includes(d.id)}
                              disabled={!reconstructionCount(d)}
                              onChange={(e) => {
                                const ids = parentIds;
                                setParentIds(
                                  e.target.checked
                                    ? [...ids, d.id]
                                    : ids.filter((id) => id !== d.id),
                                );
                                setMixWeights({});
                                setPreview(null);
                              }}
                            />
                            {reconstructionName(d)}
                            <small>
                              데이터 {num(reconstructionCount(d))}개
                            </small>
                          </label>
                        ))}
                      </fieldset>
                      <Select
                        label="선별 방식"
                        value={method}
                        onChange={(v) => {
                          setMethod(v);
                          setPreview(null);
                        }}
                      >
                        <option value="balanced_mix">균형 혼합</option>
                        <option value="merge">전체 합치기</option>
                        <option value="random">무작위 선별</option>
                        <option value="source_balanced">출처 균형 선별</option>
                        <option value="distribution">기준 분포 맞추기</option>
                      </Select>
                      {method === "balanced_mix" &&
                        reconstructionSources.length > 0 && (
                          <fieldset className="mix-weights">
                            <legend>혼합 비율</legend>
                            <p className="field-hint">
                              원본별 비율과 속성 분포를 함께 반영합니다.
                            </p>
                            {reconstructionSources.map((d) => (
                              <label className="mix-weight" key={d.id}>
                                <span>{reconstructionName(d)}</span>
                                <span className="mix-weight-input">
                                  <input
                                    type="number"
                                    aria-label={`${reconstructionName(d)} 혼합 비율`}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    disabled={
                                      busy || reconstructionSources.length === 1
                                    }
                                    value={reconstructionWeights[d.id]}
                                    onChange={(e) =>
                                      changeMixWeight(d.id, +e.target.value)
                                    }
                                  />
                                  %
                                </span>
                              </label>
                            ))}
                          </fieldset>
                        )}
                      {method === "distribution" && (
                        <Select
                          label="분포 기준 워크스페이스"
                          value={reconstructionReferenceId}
                          onChange={(id) => {
                            setReconstructionReference(id);
                            setPreview(null);
                          }}
                        >
                          {reconstructionSources.map((d) => (
                            <option key={d.id} value={d.id}>
                              {displayName(d.name)}
                            </option>
                          ))}
                        </Select>
                      )}
                      <div className="form-grid">
                        <label className="field">
                          데이터 수
                          {method === "merge" ? (
                            <input
                              readOnly
                              value={
                                preview
                                  ? `${num(preview.count)}개`
                                  : "전체 데이터 (중복 제외)"
                              }
                            />
                          ) : (
                            <input
                              type="number"
                              required
                              min="1"
                              max={Math.min(100000, reconstructionAvailable)}
                              value={budget}
                              onChange={(e) => {
                                setBudget(+e.target.value);
                                setPreview(null);
                              }}
                            />
                          )}
                        </label>
                        <label className="field">
                          시드
                          <input
                            type="number"
                            min="0"
                            max="2147483647"
                            disabled={method === "merge"}
                            value={seed}
                            onChange={(e) => {
                              setSeed(+e.target.value);
                              setPreview(null);
                            }}
                          />
                        </label>
                      </div>
                      <div className="actions">
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy || !parentIds.length || !name.trim()}
                          onClick={() =>
                            act(
                              async () =>
                                setPreview(
                                  await api<Dataset>(
                                    "/reconstructions/preview",
                                    bodyRecon(),
                                  ),
                                ),
                              "미리보기를 계산했습니다.",
                            )
                          }
                        >
                          미리보기
                        </button>
                        <button
                          className="button"
                          disabled={busy || !parentIds.length || !name.trim()}
                        >
                          워크스페이스 생성
                        </button>
                      </div>
                    </form>
                  </Panel>
                  <Panel title="미리보기">
                    {preview ? (
                      <>
                        <div className="stats compact">
                          <Stat label="데이터 수" value={num(preview.count)} />
                          <Stat
                            label="원본 워크스페이스"
                            value={preview.parent_ids.length}
                          />
                          <Stat
                            label="중복 제외"
                            value={preview.selection?.duplicate_count || 0}
                          />
                        </div>
                        {preview.selection?.mix ? (
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>워크스페이스</th>
                                  <th>목표 비율</th>
                                  <th>실제 비율</th>
                                  <th>데이터 수</th>
                                </tr>
                              </thead>
                              <tbody>
                                {preview.selection.mix.map((m) => (
                                  <tr key={m.dataset_id}>
                                    <td>{reconstructionName(m)}</td>
                                    <td>
                                      {(m.target_ratio * 100).toFixed(1)}%
                                    </td>
                                    <td>
                                      {(m.actual_ratio * 100).toFixed(1)}%
                                    </td>
                                    <td>{num(m.selected_count)}개</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          preview.selection?.by_source && (
                            <div className="table-wrap">
                              <table>
                                <thead>
                                  <tr>
                                    <th>출처</th>
                                    <th>데이터 수</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(
                                    preview.selection.by_source,
                                  ).map(([source, count]) => (
                                    <tr key={source}>
                                      <td>
                                        {source === "musinsa"
                                          ? "무신사"
                                          : source === "gsshop"
                                            ? "GS SHOP"
                                            : displayName(
                                                datasets.find(
                                                  (d) =>
                                                    d.workspace_id === source,
                                                )?.name,
                                              ) || source}
                                      </td>
                                      <td>{num(count)}개</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        )}
                        {preview.selection?.after_js != null && (
                          <div className="reconstruction-distribution">
                            <p>
                              {preview.selection.mix
                                ? "혼합 목표 분포"
                                : `분포 기준: ${displayName(preview.selection.reference_name)}`}
                            </p>
                            <dl className="details">
                              <span>선별 전 분포 차이</span>
                              <strong>
                                {preview.selection.before_js?.toFixed(4)}
                              </strong>
                              <span>선별 후 분포 차이</span>
                              <strong>
                                {preview.selection.after_js.toFixed(4)}
                              </strong>
                            </dl>
                          </div>
                        )}
                      </>
                    ) : (
                      <Empty>설정을 선택하고 미리보기를 실행하세요.</Empty>
                    )}
                  </Panel>
                </div>
              )}
              {section === "models" && !detail && (
                <>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        placeholder="모델 이름 검색"
                        value={modelSearch}
                        onChange={(e) =>
                          changeModelList({ search: e.target.value })
                        }
                      />
                    </div>

                    <label>
                      유형{" "}
                      <select
                        aria-label="모델 유형"
                        value={modelKind}
                        onChange={(e) =>
                          changeModelList({ kind: e.target.value })
                        }
                      >
                        <option value="all">전체 유형</option>
                        <option value="base">기본 모델</option>
                        <option value="lora">학습된 모델</option>
                      </select>
                    </label>
                  </div>
                  <Panel>
                    <PaginatedContent
                      key={`${modelKind}:${modelSearch}`}
                      page={modelPage}
                      onPageChange={(page) => changeModelList({ page })}
                      items={models
                        .filter(
                          (m) => modelKind === "all" || m.kind === modelKind,
                        )
                        .filter((m) =>
                          displayName(m.name)
                            .toLowerCase()
                            .includes(displayName(modelSearch).toLowerCase()),
                        )}
                      label="모델 목록"
                    >
                      {(pageModels) => (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>모델</th>
                                <th>유형</th>
                                <th>상태</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {pageModels.map((m) => (
                                <tr key={m.id}>
                                  <td>
                                    <Link
                                      className="model-name"
                                      title={displayName(m.name)}
                                      href={
                                        "/ko/models/" + m.id + modelListSuffix
                                      }
                                    >
                                      {displayName(m.name)}
                                    </Link>
                                  </td>
                                  <td>
                                    {m.kind === "base"
                                      ? "기본 모델"
                                      : "LoRA 어댑터"}
                                  </td>
                                  <td>
                                    <Badge
                                      status={
                                        m.status === "ready" && !m.available
                                          ? "unavailable"
                                          : m.status
                                      }
                                    />
                                  </td>
                                  <td>
                                    <Link
                                      aria-label={`${displayName(m.name)} 상세`}
                                      href={
                                        "/ko/models/" + m.id + modelListSuffix
                                      }
                                    >
                                      <ChevronRight size={18} />
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </PaginatedContent>
                  </Panel>
                </>
              )}
              {section === "models" &&
                detail &&
                (() => {
                  const m = models.find((x) => x.id === detail);
                  if (!m) return <Empty>모델을 찾을 수 없습니다.</Empty>;
                  return (
                    <>
                      <Link
                        className="back"
                        href={"/ko/models" + modelListSuffix}
                      >
                        <ArrowLeft size={16} />
                        모델 목록
                      </Link>
                      <div className="two-col">
                        <Panel title={displayName(m.name)}>
                          <div className="details">
                            <span>모델 계열</span>
                            <strong>{m.family}</strong>
                            <span>유형</span>
                            <strong>
                              {m.kind === "base" ? "기본 모델" : "LoRA 어댑터"}
                            </strong>
                            <span>작업</span>
                            <strong>속성추출</strong>
                            <span>상태</span>
                            <Badge
                              status={
                                m.status === "ready" && !m.available
                                  ? "unavailable"
                                  : m.status
                              }
                            />
                            <span>데이터셋</span>
                            <strong>
                              <ModelDatasetName
                                datasetId={m.dataset_id}
                                currentName={
                                  datasets.find((d) => d.id === m.dataset_id)
                                    ?.name
                                }
                                kind={m.kind}
                              />
                            </strong>
                            <span>원본 모델</span>
                            <strong>
                              {displayName(
                                models.find((x) => x.id === m.parent_id)?.name,
                              ) || "—"}
                            </strong>
                          </div>
                          <div className="actions">
                            <Link
                              className="button"
                              href={"/ko/training/" + m.id}
                            >
                              이 모델로 학습
                            </Link>
                            <Link
                              className="button secondary"
                              href={"/ko/evaluation/" + m.id}
                            >
                              평가
                            </Link>
                          </div>
                        </Panel>
                        <Panel title="모델 관리">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              act(() =>
                                api(
                                  "/models/" + m.id,
                                  { name: name || m.name, status: m.status },
                                  "PATCH",
                                ),
                              );
                            }}
                          >
                            <label className="field">
                              모델 이름
                              <Input
                                placeholder={displayName(m.name)}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={100}
                              />
                            </label>
                            <button className="button" disabled={busy}>
                              이름 저장
                            </button>
                          </form>
                          <hr />
                          <p className="muted">
                            보관한 모델은 새 학습과 평가 목록에서 제외됩니다.
                          </p>
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() =>
                              act(() =>
                                api(
                                  "/models/" + m.id,
                                  {
                                    name: m.name,
                                    status:
                                      m.status === "archived"
                                        ? "ready"
                                        : "archived",
                                  },
                                  "PATCH",
                                ),
                              )
                            }
                          >
                            {m.status === "archived"
                              ? "사용 상태로 복원"
                              : "모델 보관"}
                          </button>
                        </Panel>
                      </div>
                    </>
                  );
                })()}
              {section === "training" && (
                <div className="training-workbench">
                  <form
                    id="training-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submit("training");
                    }}
                  >
                    <p className="training-task">
                      <span>작업 유형</span>
                      <strong>패션 속성 추출</strong>
                    </p>
                    <div className="training-stages">
                      <SelectionCard title="데이터">
                        <Select
                          label="학습 데이터셋"
                          value={currentDataset?.id || ""}
                          onChange={setDatasetId}
                        >
                          {datasetOptions}
                        </Select>
                        <div className="callout">
                          학습 데이터 {num(currentDataset?.splits.train || 0)}개
                        </div>
                      </SelectionCard>
                      <SelectionCard title="모델">
                        <ModelPicker
                          label="시작 모델"
                          value={selectedModel?.id || ""}
                          onChange={setModelId}
                          options={modelOptions}
                        />
                        <label className="field">
                          학습 유형
                          <select defaultValue="lora">
                            <option value="lora">LoRA</option>
                            <option value="full" disabled>
                              Full Finetuning
                            </option>
                            <option value="grpo" disabled>
                              GRPO
                            </option>
                          </select>
                        </label>
                      </SelectionCard>
                    </div>
                  </form>
                  <dialog
                    ref={trainingSettingsRef}
                    className="workspace-dialog training-settings"
                    aria-labelledby="training-settings-title"
                  >
                    <header>
                      <h2 id="training-settings-title">학습 설정</h2>
                      <button
                        type="button"
                        aria-label="학습 설정 닫기"
                        onClick={() => trainingSettingsRef.current?.close()}
                      >
                        <X size={20} />
                      </button>
                    </header>
                    <form
                      className="settings-body"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setSteps(draftTraining.steps);
                        setLr(draftTraining.lr);
                        setSeed(draftTraining.seed);
                        trainingSettingsRef.current?.close();
                      }}
                    >
                      <div className="form-grid">
                        <label className="field">
                          학습 스텝
                          <input
                            type="number"
                            min="1"
                            max="10000"
                            required
                            value={draftTraining.steps}
                            onChange={(e) =>
                              setDraftTraining((v) => ({
                                ...v,
                                steps: +e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="field">
                          학습률
                          <input
                            type="number"
                            min="0.000001"
                            max="0.01"
                            step="0.000001"
                            required
                            value={draftTraining.lr}
                            onChange={(e) =>
                              setDraftTraining((v) => ({
                                ...v,
                                lr: +e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label className="field">
                        재현성 시드
                        <input
                          type="number"
                          min="0"
                          required
                          value={draftTraining.seed}
                          onChange={(e) =>
                            setDraftTraining((v) => ({
                              ...v,
                              seed: +e.target.value,
                            }))
                          }
                        />
                      </label>
                      <footer>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => trainingSettingsRef.current?.close()}
                        >
                          취소
                        </button>
                        <button className="button">적용</button>
                      </footer>
                    </form>
                  </dialog>
                </div>
              )}
              {section === "model-api" && <ModelApi refreshToken={datasets} />}
              {section === "evaluation" && (
                <>
                  <Panel title="평가 실행">
                    <form
                      className="horizontal-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submit("evaluation");
                      }}
                    >
                      <ModelPicker
                        label="모델"
                        value={selectedModel?.id || ""}
                        onChange={setModelId}
                        options={modelOptions}
                      />
                      <Select
                        label="데이터셋"
                        value={currentDataset?.id || ""}
                        onChange={setDatasetId}
                      >
                        {datasetOptions}
                      </Select>
                      <Select
                        label="평가 분할"
                        value={evalSplit}
                        onChange={setEvalSplit}
                      >
                        <option value="validation">검증</option>
                        <option value="test">테스트</option>
                      </Select>
                      <button
                        className="button"
                        disabled={busy || !currentDataset || !selectedModel}
                      >
                        평가 시작
                      </button>
                    </form>
                    <p className="field-hint">
                      {evalSplit === "test" ? "테스트" : "검증"} 데이터{" "}
                      {num(currentDataset?.splits[evalSplit] || 0)}개 전체를
                      평가합니다.
                    </p>
                  </Panel>
                  {runHeader()}
                  {activeRun?.result?.count ? (
                    <>
                      <div className="stats">
                        <Stat
                          label="평가 샘플"
                          value={activeRun.result.count}
                        />
                        <Stat
                          label="속성 평균 일치도"
                          value={pct(activeRun.result.macro_attribute_accuracy)}
                        />
                        <Stat
                          label="전체 속성 일치"
                          value={pct(activeRun.result.exact_match)}
                        />
                        <Stat
                          label="출력 형식 오류"
                          value={activeRun.result.schema_failures}
                          sub={`JSON 파싱 실패 ${activeRun.result.parse_failures ?? 0}개 포함`}
                        />
                      </div>

                      <Panel title="속성별 평가">
                        {Object.entries(activeRun.result.fields || {}).map(
                          ([key, value]) => (
                            <div className="metric-row" key={key}>
                              <span>{names[key] || key}</span>
                              <div className="bar">
                                <i
                                  style={{
                                    width:
                                      value.accuracy == null
                                        ? "0%"
                                        : pct(value.accuracy),
                                  }}
                                />
                              </div>
                              <strong>{pct(value.accuracy)}</strong>
                              <small>{value.count}개</small>
                            </div>
                          ),
                        )}
                      </Panel>
                      <details className="evaluation-results panel">
                        <summary>
                          이미지별 결과{" "}
                          <span>
                            {activeRun.result.predictions?.length || 0}개
                          </span>
                        </summary>
                        <PaginatedContent
                          key={activeRun.id}
                          items={activeRun.result.predictions || []}
                          label="평가 결과"
                          layout="results"
                        >
                          {(pagePredictions, offset) => (
                            <div className="evaluation-results-list">
                              {pagePredictions.map((p, index) => (
                                <details key={p.sample_id}>
                                  <summary>
                                    <span>이미지 {offset + index + 1}</span>{" "}
                                    <Badge>
                                      {p.prediction
                                        ? p.schema_valid
                                          ? "형식 정상"
                                          : "형식 오류"
                                        : "파싱 실패"}
                                    </Badge>
                                  </summary>
                                  <div className="prediction evaluation-prediction">
                                    <a
                                      className="prediction-image"
                                      href={`/api/datasets/${activeRun.request.dataset_id}/images/${encodeURIComponent(p.sample_id)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`평가 이미지 ${offset + index + 1} 크게 보기`}
                                    >
                                      <img
                                        src={`/api/datasets/${activeRun.request.dataset_id}/images/${encodeURIComponent(p.sample_id)}`}
                                        alt={`평가 이미지 ${offset + index + 1}`}
                                        loading="lazy"
                                      />
                                      <span>이미지 크게 보기</span>
                                    </a>
                                    <div>
                                      <h3>레이블</h3>
                                      <pre>
                                        {JSON.stringify(p.target, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <h3>모델 응답</h3>
                                      <pre>{p.raw}</pre>
                                    </div>
                                  </div>
                                </details>
                              ))}
                            </div>
                          )}
                        </PaginatedContent>
                      </details>
                    </>
                  ) : (
                    activeRun && (
                      <Panel title="평가 상태">
                        <p>{activeRun.error || states[activeRun.status]}</p>
                        <progress
                          value={activeRun.progress.step || 0}
                          max={activeRun.progress.total || 1}
                        />
                        <p className="muted">
                          {activeRun.progress.step || 0} /{" "}
                          {activeRun.progress.total || "—"}개
                        </p>
                      </Panel>
                    )
                  )}
                  {runList()}
                </>
              )}
              {section === "monitoring" && detail === "training" && (
                <>
                  <div className="stats">
                    <Stat
                      label="진행 중"
                      value={
                        visibleRuns.filter((j) => j.status === "running").length
                      }
                    />
                    <Stat
                      label="대기 중"
                      value={
                        visibleRuns.filter((j) => j.status === "queued").length
                      }
                    />
                    <Stat
                      label="완료"
                      value={
                        visibleRuns.filter((j) => j.status === "succeeded")
                          .length
                      }
                    />
                    <Stat
                      label="실패 / 취소"
                      value={
                        visibleRuns.filter((j) =>
                          ["failed", "cancelled"].includes(j.status),
                        ).length
                      }
                    />
                  </div>
                  {runHeader()}
                  {activeRun && (
                    <>
                      <div className="two-col">
                        <Panel
                          title={
                            activeRun.request.kind === "labeling"
                              ? "자동 레이블링"
                              : "학습 진행"
                          }
                        >
                          <progress
                            value={activeRun.progress.step || 0}
                            max={
                              activeRun.progress.total ||
                              activeRun.request.max_steps
                            }
                          />
                          <p>
                            {activeRun.progress.step || 0} /{" "}
                            {activeRun.progress.total ||
                              activeRun.request.max_steps}{" "}
                            {activeRun.request.kind === "labeling"
                              ? "이미지"
                              : "스텝"}
                          </p>
                          <div className="details">
                            <span>현재 손실</span>
                            <strong>
                              {activeRun.progress.loss?.toFixed(4) || "—"}
                            </strong>
                            <span>경과 시간</span>
                            <strong>
                              <RunElapsed
                                key={activeRun.id}
                                status={activeRun.status}
                                startedAt={activeRun.started_at}
                                finishedAt={activeRun.finished_at}
                                elapsedSeconds={
                                  activeRun.progress.elapsed_seconds
                                }
                              />
                            </strong>
                            <span>실행 단계</span>
                            <strong>
                              {phases[activeRun.progress.phase || "queued"] ||
                                activeRun.progress.phase}
                            </strong>
                          </div>
                          {activeRun.error && (
                            <p className="error-text">{activeRun.error}</p>
                          )}
                          {activeRun.result?.model_id && (
                            <Link
                              className="button"
                              href={"/ko/models/" + activeRun.result.model_id}
                            >
                              완료된 모델 보기
                              <ArrowUpRight size={16} />
                            </Link>
                          )}
                          {activeRun.result?.dataset_id && (
                            <Link
                              className="button"
                              href={
                                "/ko/workspaces/" +
                                datasets.find(
                                  (d) => d.id === activeRun.result?.dataset_id,
                                )?.workspace_id
                              }
                            >
                              재레이블링 결과 보기
                            </Link>
                          )}
                        </Panel>
                        <Panel title="학습 손실">
                          <Chart points={activeRun.progress.history || []} />
                        </Panel>
                      </div>
                      <details className="help-details">
                        <summary>실행 로그</summary>
                        <pre className="logs">
                          {logs || "아직 기록된 로그가 없습니다."}
                        </pre>
                      </details>
                    </>
                  )}
                  {runList()}
                </>
              )}
              {section === "monitoring" && detail === "drift" && (
                <>
                  <Panel title="비교 설정">
                    <form
                      className="horizontal-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submit("drift");
                      }}
                    >
                      <Select
                        label="기준 데이터셋"
                        value={
                          reference ||
                          datasets.find((d) => d.id !== currentDataset?.id)
                            ?.id ||
                          ""
                        }
                        onChange={setReference}
                      >
                        {datasetOptions}
                      </Select>
                      <Select
                        label="비교 데이터셋"
                        value={currentDataset?.id || ""}
                        onChange={setDatasetId}
                      >
                        {datasetOptions}
                      </Select>
                      <label className="field">
                        JS 임계값
                        <input
                          type="number"
                          min="0.001"
                          max="1"
                          step="0.001"
                          value={threshold}
                          onChange={(e) => setThreshold(+e.target.value)}
                        />
                      </label>
                      <button
                        className="button"
                        disabled={busy || datasets.length < 2}
                      >
                        탐지 실행
                      </button>
                    </form>
                  </Panel>
                  {runHeader()}
                  {activeRun?.result && (
                    <DriftResults
                      fields={(activeRun.result.fields as DriftField[]) || []}
                      threshold={activeRun.result.threshold}
                      referenceCount={activeRun.result.reference_count}
                      currentCount={activeRun.result.current_count}
                      imageJs={activeRun.result.image_histogram_js}
                      names={names}
                      currentWorkspace={activeRun.dataset_workspace_id}
                      referenceWorkspace={activeRun.reference_workspace_id}
                    />
                  )}
                  {activeRun?.error && (
                    <div className="alert error">{activeRun.error}</div>
                  )}
                  {runList()}
                  <RelabelReport />
                </>
              )}
            </>
          )}
        </main>
      </div>
      {uploadOpen && (
        <ImageUpload
          workspaces={workspaces}
          workspaceId={section === "workspaces" ? workspace?.id : undefined}
          onClose={() => setUploadOpen(false)}
          onComplete={(result) => {
            setUploadOpen(false);
            setDatasetId(result.dataset.id);
            setOffset(0);
            setSplit("");
            setSearch("");
            setNotice(
              result.duplicate
                ? "이미 등록된 이미지입니다."
                : `${result.added_count ?? result.dataset.count}개 이미지를 추가했습니다.${result.skipped_duplicates ? ` 중복 이미지 ${result.skipped_duplicates}개는 제외했습니다.` : ""} 자동 레이블링에서 모델을 선택하세요.`,
            );
            void refresh().catch(() =>
              setError(
                "업로드는 완료됐으나 목록 갱신에 실패했습니다. 새로고침하세요.",
              ),
            );
            router.push("/ko/workspaces/" + result.dataset.workspace_id);
          }}
        />
      )}
      {labelingDataset && (
        <AutoLabelDialog
          dataset={labelingDataset}
          initialModelId={
            workspaces.find((w) => w.id === labelingDataset.workspace_id)
              ?.labeling_model_id || ""
          }
          onClose={() => setLabelingDataset(null)}
          onStarted={(jobId) => {
            setLabelingDataset(null);
            setSelectedRun(jobId);
            setNotice(
              "자동 레이블링을 접수했습니다. 완료 후 레이블 결과 보기에서 확인하세요.",
            );
            void refresh().catch(() =>
              setError("작업은 접수됐으나 목록 갱신에 실패했습니다."),
            );
          }}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(result) => {
            const wasWorkspace = deleteTarget.kind === "workspace";
            setDeleteTarget(null);
            setSelectedSamples([]);
            setSample(null);
            setOffset(0);
            setDatasetId(result.dataset?.id || "");
            void act(
              async () => {},
              "삭제했습니다. 전체 워크스페이스의 삭제 목록에서 복원할 수 있습니다.",
            );
            if (wasWorkspace) router.push("/ko/workspaces");
          }}
        />
      )}
      {trashOpen && (
        <DeletedItems
          onClose={() => setTrashOpen(false)}
          onRestored={() => {
            void refresh().catch((e) => setError(e.message));
          }}
        />
      )}
      {newWorkspace && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              editWorkspaceId ? "워크스페이스 수정" : "워크스페이스 만들기"
            }
          >
            <div className="panel-heading">
              <h2>
                {editWorkspaceId ? "워크스페이스 수정" : "워크스페이스 만들기"}
              </h2>
              <button aria-label="닫기" onClick={() => setNewWorkspace(false)}>
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api(
                    "/workspaces" +
                      (editWorkspaceId ? "/" + editWorkspaceId : ""),
                    {
                      name,
                      description,
                      task: "attribute_extraction",
                      labeling_model_id: workspaceLabelModel || null,
                    },
                    editWorkspaceId ? "PATCH" : "POST",
                  );
                  setNewWorkspace(false);
                  setName("");
                  setDescription("");
                });
              }}
            >
              <label className="field">
                이름
                <Input
                  autoFocus
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                설명
                <textarea
                  value={description}
                  maxLength={1000}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="field">
                레이블링 모델
                <select
                  value={workspaceLabelModel}
                  onChange={(e) => setWorkspaceLabelModel(e.target.value)}
                  disabled={labelModelsLoading}
                >
                  <option value="">
                    {labelModelsLoading ? "모델 불러오는 중" : "미설정"}
                  </option>
                  {workspaceLabelModel &&
                    !labelModels.some((m) => m.id === workspaceLabelModel) && (
                      <option value={workspaceLabelModel}>
                        {workspaces.find((w) => w.id === editWorkspaceId)
                          ?.labeling_model_name || workspaceLabelModel}{" "}
                        (현재 설정)
                      </option>
                    )}
                  {labelModels.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      disabled={!m.available || m.status !== "ready"}
                    >
                      {displayName(m.name)}
                      {!m.available
                        ? " / 파일 없음"
                        : m.status !== "ready"
                          ? " / 보관됨"
                          : ""}
                    </option>
                  ))}
                </select>
              </label>
              {labelModelsError && (
                <p role="alert" className="error-text">
                  {labelModelsError}
                </p>
              )}
              <label className="field">
                작업 유형
                <div>
                  <Badge>속성추출</Badge>
                </div>
              </label>
              <button className="button" disabled={busy || labelModelsLoading}>
                {editWorkspaceId ? "수정 저장" : "만들기"}
              </button>
            </form>
          </section>
        </div>
      )}
      {sample && currentDataset && (
        <LabelEditor
          key={currentDataset.id + ":" + sample.id}
          sample={sample}
          dataset={currentDataset}
          position={Math.max(0, editorIds.indexOf(sample.id))}
          total={editorIds.length || samples.total}
          navigationBusy={editorLoading}
          navigationError={editorError}
          onClose={closeSample}
          onMove={moveSample}
          onSaved={(version, updated, message) => {
            setDatasets((current) => [
              version,
              ...current.filter((d) => d.workspace_id !== version.workspace_id),
            ]);
            setEditingDataset(version);
            setDatasetId(version.id);
            setSample(updated);
            setNotice(message || "레이블을 저장했습니다.");
          }}
        />
      )}
    </div>
  );
}
