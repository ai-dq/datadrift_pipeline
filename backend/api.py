import asyncio
import hashlib
import json
import os
import copy
from collections import Counter
from contextlib import asynccontextmanager
from typing import Literal
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse, Response
from pydantic import BaseModel, Field, ConfigDict
from . import store as s
from .catalog import initialize, import_labeled, model_available
from . import taxonomy
from . import reconstruction as reconstruction_sampling
from . import workspace_data as wd
from .sample_view import public_sample
from .model_endpoints import router as model_endpoints_router


@asynccontextmanager
async def lifespan(app):
    initialize()
    yield


app = FastAPI(
    title="DataDrift · Attribute Extraction",
    version="0.2.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


app.include_router(model_endpoints_router)


@app.exception_handler(KeyError)
async def missing(request, exc):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ValueError)
async def invalid(request, exc):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.middleware("http")
async def same_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    # Same-origin browser writes only. CLI calls without Origin are permitted on the trusted network.
    if request.method not in ("GET", "HEAD", "OPTIONS") and origin:
        from urllib.parse import urlsplit

        if origin != os.environ.get("DATADRIFT_PUBLIC_ORIGIN") and urlsplit(
            origin
        ).netloc != request.headers.get("host"):
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=403, content={"detail": "Cross-origin write refused"}
            )
    return await call_next(request)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Workspace(Strict):
    labeling_model_id: str | None = None
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    task: Literal["attribute_extraction"] = "attribute_extraction"


class Rename(Strict):
    name: str = Field(min_length=1, max_length=100)
    status: Literal["ready", "archived"] = "ready"


class LabelEdit(Strict):
    category: Literal["아우터", "상의", "하의", "ACC"] | None = None
    target: dict[str, str | list[str]]
    unscored_fields: list[str] = Field(default_factory=list, max_length=14)
    human_verified: bool = False
    note: str = Field(default="", max_length=1000)
    split: Literal["unassigned", "train", "validation", "test"] | None = None


class SplitEdit(Strict):
    sample_ids: list[str] = Field(min_length=1, max_length=100000)
    split: Literal["unassigned", "train", "validation", "test"]


class Reconstruction(Strict):
    workspace_id: str | None = None
    name: str = Field(min_length=1, max_length=100)
    dataset_ids: list[str] = Field(min_length=1, max_length=8)
    data_count: int | None = Field(default=None, ge=1, le=100000)
    train_budget: int | None = Field(default=None, ge=1, le=100000)
    reference_id: str | None = None
    dataset_weights: dict[str, float] = Field(default_factory=dict)
    seed: int = Field(default=42, ge=0, le=2147483647)

    method: Literal["balanced_mix", "merge", "source_balanced", "random", "distribution"] = "balanced_mix"


class Job(Strict):
    kind: Literal["training", "evaluation", "drift", "labeling"]
    dataset_id: str
    model_id: str | None = None
    reference_id: str | None = None
    max_steps: int = Field(default=20, ge=1, le=10000)
    learning_rate: float = Field(default=2e-5, gt=0, le=0.01)
    sample_limit: int | None = Field(default=None, ge=1, le=10000)
    split: Literal["validation", "test"] = "validation"
    threshold: float = Field(default=0.1, gt=0, le=1)
    seed: int = Field(default=42, ge=0, le=2147483647)
    sampling: Literal["random", "source_balanced"] = "random"


@app.get("/api/health")
def health():
    with s.db() as c:
        c.execute("SELECT 1")
    return {"status": "ok", "task": "attribute_extraction"}


@app.get("/api/experiments/relabel-drift")
def relabel_experiment():
    path = s.ROOT / "relabel-drift-experiment.json"
    if not path.exists():
        return {"status": "not_started"}
    report = json.loads(path.read_text())
    # The coordinator may await a queued training job while an earlier evaluation runs.
    if report["status"] not in {"succeeded", "failed"}:
        for key, jid in report.get("jobs", {}).items():
            try:
                job = s.get("job", jid)
            except KeyError:
                continue
            if job["status"] == "running":
                report["active_job"] = {
                    "key": key,
                    "id": jid,
                    "status": job["status"],
                    "progress": job["progress"],
                }
                break
    return report


def workspace_labeling_model(workspace, dataset=None):
    return workspace.get("labeling_model_id", (dataset or {}).get("labeling_model_id"))


@app.get("/api/workspaces")
def workspaces():
    ds = s.dataset_summaries(current_only=True)
    names = {m["id"]: m["name"] for m in s.all_of("model")}
    names["gemma4_teacher"] = "Gemma-4-12B"
    result = []
    for w in s.all_of("workspace"):
        data = [d for d in ds if d["workspace_id"] == w["id"]]
        mid = workspace_labeling_model(w, data[0] if data else None)
        result.append(w | {"datasets": data, "labeling_model_id": mid,
                           "labeling_model_name": names.get(mid, mid)})
    return result


@app.post("/api/workspaces", status_code=201)
def create_workspace(body: Workspace):
    if body.labeling_model_id:
        selected_labeling_model(body.labeling_model_id)
    return s.save(
        "workspace", body.model_dump() | {"id": s.uid(), "created_at": s.now()}
    )


@app.patch("/api/workspaces/{wid}")
def edit_workspace(wid: str, body: Workspace):
    current = s.get("workspace", wid)
    if body.labeling_model_id and body.labeling_model_id != current.get("labeling_model_id"):
        selected_labeling_model(body.labeling_model_id)
    return s.patch("workspace", wid, **body.model_dump(exclude_unset=True))


class Deletion(Strict):
    kind: Literal["workspace", "dataset", "samples"]
    id: str
    sample_ids: list[str] = Field(default_factory=list, max_length=1000)
    token: str = ""


@app.post("/api/deletions/preview")
def deletion_preview(body: Deletion):
    from . import deletions

    return deletions.preview(body.kind, body.id, body.sample_ids)


@app.post("/api/deletions", status_code=201)
def delete_data(body: Deletion):
    from . import deletions

    return deletions.delete(body.kind, body.id, body.sample_ids, body.token)


@app.get("/api/deletions")
def deleted_data():
    from . import deletions

    return deletions.entries()


@app.post("/api/deletions/{bid}/restore")
def restore_data(bid: str):
    from . import deletions

    return deletions.restore(bid)


@app.post("/api/imports/labeled")
def imports():
    from .migrate_taxonomy import migrate

    imported = import_labeled()
    migrated = migrate({d["id"] for d in imported})
    with s.db() as con:
        con.execute("BEGIN IMMEDIATE")
        for dataset in migrated:
            wid = dataset["workspace_id"]
            if not con.execute(
                "SELECT 1 FROM workspace_data WHERE workspace_id=?", (wid,)
            ).fetchone():
                s.get("workspace", wid, con)
                wd.point(wid, dataset["id"], con)
    return migrated


@app.post(
    "/api/workspaces/{wid}/images",
    status_code=201,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["files"],
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {"type": "string", "format": "binary"},
                            }
                        },
                    }
                }
            },
        }
    },
)
async def upload_images(
    wid: str,
    request: Request,
    name: str = Query(min_length=1, max_length=100),
    category: Literal["아우터", "상의", "하의", "ACC"] | None = None,
    split: Literal["unassigned", "train", "validation", "test"] = "train",
):
    from starlette.formparsers import MultiPartParser, MultiPartException
    from starlette.datastructures import UploadFile
    from starlette.concurrency import run_in_threadpool
    from .uploads import import_images, MAX_BATCH, MAX_FILES, MAX_IMAGE

    s.get("workspace", wid)
    name = name.strip()
    if not name:
        raise ValueError("데이터셋 이름을 입력하세요.")
    if not request.headers.get("content-type", "").startswith("multipart/form-data"):
        raise HTTPException(415, "이미지 파일을 multipart/form-data로 전송하세요.")

    class SizeLimit(MultiPartException):
        pass

    async def limited_stream():
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BATCH + 1024 * 1024:
                raise SizeLimit("한 번에 100MB까지 업로드할 수 있습니다.")
            yield chunk

    try:
        form = await MultiPartParser(
            request.headers,
            limited_stream(),
            max_files=MAX_FILES,
            max_fields=0,
            max_part_size=MAX_IMAGE,
        ).parse()
    except SizeLimit as exc:
        raise HTTPException(413, exc.message) from exc
    except MultiPartException as exc:
        raise HTTPException(
            422, "업로드 형식 또는 파일 수를 확인하세요. " + exc.message
        ) from exc
    try:
        items = form.multi_items()
        if any(
            key != "files" or not isinstance(value, UploadFile) for key, value in items
        ):
            raise ValueError("files 항목에 이미지 파일을 첨부하세요.")
        return await run_in_threadpool(
            import_images, [v for _, v in items], wid, name, category, split
        )
    finally:
        await form.close()


def selected_labeling_model(model_id, schema_id=None):
    if model_id in (None, "gemma4_teacher"):
        from .relabeling import TEACHER

        if not (TEACHER / "config.json").is_file():
            raise ValueError("Gemma 레이블링 모델 파일이 없습니다.")
        return None
    m = s.get("model", model_id)
    if m["status"] != "ready" or not model_available(m):
        raise ValueError("사용 가능한 모델을 선택하세요.")
    if m["kind"] == "lora" and schema_id is not None and m.get("schema_id", taxonomy.LEGACY) != schema_id:
        raise ValueError("데이터와 같은 레이블 형식으로 학습한 모델을 선택하세요.")
    return m


@app.get("/api/labeling-models")
def labeling_models(schema_id: str = taxonomy.CURRENT):
    from .relabeling import TEACHER

    taxonomy.schema(schema_id)
    return [
        m
        for m in models(summary=True)
        if m["kind"] == "base" or m.get("schema_id", taxonomy.LEGACY) == schema_id
    ] + [
        {
            "id": "gemma4_teacher",
            "name": "Gemma-4-12B",
            "family": "gemma4",
            "kind": "base",
            "status": "ready",
            "available": (TEACHER / "config.json").is_file(),
        }
    ]


def require_labels(dataset):
    count = sum(row.get("label_state") == "unlabeled" for row in dataset["rows"])
    if count:
        raise ValueError(
            f"미레이블 이미지가 {count}개 있습니다. 자동 레이블링 또는 수동 검토를 먼저 완료하세요."
        )


@app.get("/api/datasets")
def datasets(workspace_id: str | None = None, current: bool = False):
    values = s.dataset_summaries(workspace_id=workspace_id, current_only=current)
    if current:
        names = {w["id"]: w["name"] for w in s.all_of("workspace")}
        return [d | {"name": names.get(d["workspace_id"], d["name"])} for d in values]
    return values


@app.get("/api/datasets/{did}")
def dataset(did: str):
    values = s.dataset_summaries(dataset_id=did)
    if not values:
        raise KeyError(f"dataset not found: {did}")
    return values[0]


@app.get("/api/datasets/{did}/samples")
def samples(
    did: str,
    ids_only: bool = False,
    split: Literal["unassigned", "train", "validation", "test"] | None = None,
    source: str | None = None,
    q: str = "",
    review: Literal["unlabeled", "pending", "verified"] | None = None,
    attribute: str | None = None,
    value: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
):
    rows = [
        r
        for r in s.get("dataset", did)["rows"]
        if (split is None or r["split"] == split)
        and (source is None or r["source"] == source)
        and (
            review is None
            or (review == "unlabeled" and r.get("label_state") == "unlabeled")
            or (
                review == "verified"
                and r.get("human_verified")
                and r.get("label_state") != "unlabeled"
            )
            or (
                review == "pending"
                and not r.get("human_verified")
                and r.get("label_state") != "unlabeled"
            )
        )
        and (
            attribute is None
            or (
                attribute not in r.get("unscored_fields", [])
                and r["target"].get(attribute)
                not in (None, "unknown", "not_applicable")
                and (
                    value is None
                    or str(
                        sorted(r["target"][attribute])
                        if isinstance(r["target"][attribute], list)
                        else r["target"][attribute]
                    )
                    == value
                )
            )
        )
        and (
            not q
            or q.lower()
            in json.dumps(
                r["target"] | {"product_id": r["product_id"]}, ensure_ascii=False
            ).lower()
        )
    ]
    if ids_only:
        return {"total": len(rows), "ids": [r["id"] for r in rows]}
    return {
        "total": len(rows),
        "items": [
            public_sample(r)
            for r in rows[offset : offset + limit]
        ],
    }


@app.get("/api/datasets/{did}/samples/{sid}")
def sample_detail(did: str, sid: str):
    row = next((r for r in s.get("dataset", did)["rows"] if r["id"] == sid), None)
    if row is None:
        raise HTTPException(404, "이미지를 찾을 수 없습니다.")
    return public_sample(row)


@app.get("/api/datasets/{did}/images/{sid}")
def image(did: str, sid: str):
    path = Path(s.image_path(did, sid))
    if not path.is_file():
        raise HTTPException(404, "Source image unavailable")
    return FileResponse(
        path,
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.get("/api/label-schema")
def label_schema(schema_id: str = taxonomy.CURRENT, category: str | None = None):
    return taxonomy.schema(schema_id, category)


@app.get("/api/taxonomy")
def taxonomy_definition():
    return taxonomy.BOOK | {
        "field_names": taxonomy.NAMES,
        "categories_with_attributes": taxonomy.CATEGORIES,
    }


@app.post("/api/datasets/{did}/samples/{sid}/labels", status_code=201)
def edit_labels(did: str, sid: str, body: LabelEdit):
    with s.db() as c:
        c.execute("BEGIN IMMEDIATE")
        opened = s.get("dataset", did, c)
        original = wd.editable(opened, sid, c)
        if body.split is not None and opened["id"] != original["id"]:
            before = next(r for r in opened["rows"] if r["id"] == sid)
            after = next(r for r in original["rows"] if r["id"] == sid)
            if before["split"] != after["split"]:
                raise HTTPException(409, "데이터 구분이 변경되었습니다. 다시 열어 확인하세요.")
        did = original["id"]
        version = copy.deepcopy(original)
        row = next((r for r in version["rows"] if r["id"] == sid), None)
        if row is None:
            raise HTTPException(404, "Sample not found")
        schema_id = original.get("schema_id", taxonomy.LEGACY)
        previous_category = row.get("category")
        if schema_id == taxonomy.CURRENT:
            if body.category is not None:
                row["category"] = body.category
            if taxonomy.category(row.get("category")) not in taxonomy.CATEGORIES:
                raise ValueError("상품 카테고리를 선택하세요.")
        if not taxonomy.valid(body.target, schema_id, row.get("category")):
            raise ValueError("선택한 기준과 카테고리의 속성·허용값을 확인하세요.")
        if not set(body.unscored_fields) <= set(
            taxonomy.schema(schema_id, row.get("category"))
        ):
            raise ValueError("평가 제외 속성이 올바르지 않습니다.")
        timestamp, vid = s.now(), s.uid()
        if body.split is not None:
            wd.set_split(row, body.split, timestamp)
        row.setdefault("original_label_source", row.get("label_source", "unknown"))
        row.setdefault("label_history", []).append(
            {
                "at": timestamp,
                "parent_dataset_id": did,
                "before": {
                    "target": copy.deepcopy(row["target"]),
                    "category": previous_category,
                    "unscored_fields": row.get("unscored_fields", []),
                    "human_verified": row.get("human_verified", False),
                    "label_source": row.get("label_source", "unknown"),
                },
                "note": body.note,
                "channel": "manual_web_or_api",
            }
        )
        row.update(
            target=body.target,
            unscored_fields=sorted(set(body.unscored_fields)),
            human_verified=body.human_verified,
            label_source="수동 레이블 · 사용자 검토 완료"
            if body.human_verified
            else "수동 레이블 · 검토 중",
            reviewed_at=timestamp if body.human_verified else None,
        )
        if "label_state" in row:
            row["label_state"] = (
                "labeled"
                if any(
                    key not in row["unscored_fields"]
                    and value not in ("unknown", "not_applicable")
                    for key, value in row["target"].items()
                )
                else "unlabeled"
            )
        base_name = original.get("annotation_base_name", original["name"])
        version.update(
            id=vid,
            name=f"{base_name} · 레이블 수정 {vid[:6]}",
            annotation_base_name=base_name,
            created_at=timestamp,
            kind="annotation",
            parent_ids=[did],
            provenance="수동 수정본",
            fingerprint=hashlib.sha256(
                json.dumps(version["rows"], sort_keys=True, ensure_ascii=False).encode()
            ).hexdigest(),
        )
        wd.publish(version, c)
    return {
        "dataset": s.public_dataset(version),
        "sample": public_sample(row),
    }


@app.delete("/api/datasets/{did}/samples/{sid}/review")
def cancel_review(did: str, sid: str):
    with s.db() as c:
        c.execute("BEGIN IMMEDIATE")
        opened = s.get("dataset", did, c)
        original = wd.editable(opened, sid, c)
        rows = copy.deepcopy(original["rows"])
        row = next((r for r in rows if r["id"] == sid), None)
        if row is None:
            raise HTTPException(404, "이미지를 찾을 수 없습니다.")
        if not row.get("human_verified"):
            return {"dataset": s.public_dataset(original), "sample": public_sample(row)}
        timestamp = s.now()
        row.setdefault("label_history", []).append({
            "at": timestamp,
            "parent_dataset_id": original["id"],
            "channel": "review_cancelled",
            "note": "검토 취소",
            "before": {
                "human_verified": row["human_verified"],
                "reviewed_at": row.get("reviewed_at"),
                "label_source": row.get("label_source"),
            },
        })
        row.update(human_verified=False, reviewed_at=None)
        if row.get("label_source") == "수동 레이블 · 사용자 검토 완료":
            row["label_source"] = "수동 레이블 · 검토 대기"
        version = wd.revision(original, rows, kind="annotation", provenance="검토 취소")
        wd.publish(version, c)
    return {"dataset": s.public_dataset(version), "sample": public_sample(row)}


@app.post("/api/datasets/{did}/samples/split")
def edit_splits(did: str, body: SplitEdit):
    with s.db() as c:
        c.execute("BEGIN IMMEDIATE")
        original = s.get("dataset", did, c)
        active = wd.current(original["workspace_id"], c)
        if not active or active["id"] != did:
            raise HTTPException(409, "데이터가 변경되었습니다. 목록을 새로고침하세요.")
        selected = set(body.sample_ids)
        if not selected <= {r["id"] for r in original["rows"]}:
            raise HTTPException(404, "선택한 이미지를 찾을 수 없습니다.")
        rows = copy.deepcopy(original["rows"])
        timestamp = s.now()
        changed = sum(
            wd.set_split(row, body.split, timestamp)
            for row in rows if row["id"] in selected
        )
        version = original
        if changed:
            version = wd.revision(original, rows, kind="split_edit")
            wd.publish(version, c)
    return {"dataset": s.public_dataset(version), "changed_count": changed}


@app.get("/api/datasets/{did}/export")
def export(did: str):
    d = s.get("dataset", did)
    # Export portable provenance; image bytes remain in the controlled source storage.
    content = (
        "\n".join(
            json.dumps({k: v for k, v in r.items() if k != "image"}, ensure_ascii=False)
            for r in d["rows"]
        )
        + "\n"
    )
    return Response(
        content,
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="{did}.jsonl"'},
    )


def reconstruct(body: Reconstruction, con=None):
    # Requests using only the old count field retain their original API default.
    if body.train_budget is not None and body.data_count is None and "method" not in body.model_fields_set:
        body = body.model_copy(update={"method": "source_balanced"})
    if body.workspace_id is not None:
        s.get("workspace", body.workspace_id, con)
    parents = [s.get("dataset", did, con) for did in dict.fromkeys(body.dataset_ids)]
    if body.data_count is not None and body.train_budget is not None:
        raise ValueError("데이터 수는 하나의 기준으로 지정하세요.")
    legacy = body.data_count is None and body.train_budget is not None and body.method in ("source_balanced", "random")
    input_splits = ("train",) if legacy else reconstruction_sampling.CANDIDATE_SPLITS
    if body.method != "merge":
        for parent in parents:
            if body.method == "balanced_mix" and body.dataset_weights.get(parent["id"]) == 0:
                continue
            require_labels(parent if legacy else {"rows": [r for r in parent["rows"] if r["split"] in input_splits]})
    schema_ids = {d.get("schema_id", taxonomy.LEGACY) for d in parents}
    if len(schema_ids) != 1:
        raise ValueError("서로 다른 레이블 기준은 함께 재구성할 수 없습니다.")
    unique = {}
    for d in parents:
        for row in d["rows"]:
            key = row["sha256"]
            if key in unique and (
                (unique[key]["split"] != row["split"] and not {unique[key]["split"], row["split"]} <= set(input_splits))
                or unique[key]["target"] != row["target"]
            ):
                raise ValueError("Overlapping samples have conflicting split or labels")
            unique[key] = row
    candidates = sorted(
        [r for r in unique.values() if r["split"] in input_splits], key=lambda r: r["id"]
    )
    if body.method == "merge" and any(count is not None and count != len(candidates) for count in (body.data_count, body.train_budget)):
        raise ValueError("전체 합치기는 데이터 수를 지정하지 않습니다.")
    reference = None
    if body.method == "distribution":
        reference = next((d for d in parents if d["id"] == body.reference_id), None)
        if reference is None:
            raise ValueError("선택한 원본 중 기준 워크스페이스를 지정하세요.")
    count = body.data_count if body.data_count is not None else body.train_budget
    if body.method == "balanced_mix":
        selected, distribution = reconstruction_sampling.balanced_mix(parents, count, body.seed, body.dataset_weights)
    else:
        if body.dataset_weights:
            raise ValueError("혼합 비율은 균형 혼합에서만 지정할 수 있습니다.")
        selected, distribution = reconstruction_sampling.select(
            candidates, count, body.method, body.seed,
            list({r["sha256"]: r for r in reference["rows"] if r["split"] in input_splits}.values()) if reference else None,
        )
    selected_count = len(selected)
    promoted_count = sum(r["split"] == "unassigned" for r in selected)
    selected = [r | {"split": "train", "source_split": "unassigned"} if r["split"] == "unassigned" else r for r in selected]
    # Preserve the old train_budget contract for existing API clients only.
    if legacy:
        selected = selected + [r for r in unique.values() if r["split"] in ("validation", "test")]
    selection = {
        "scope": "with_holdout" if legacy else "train_only",
        "input_splits": list(input_splits),
        "promoted_count": promoted_count,
        "available_count": len(candidates),
        "selected_count": selected_count,
        "duplicate_count": sum(r["split"] in input_splits for d in parents for r in d["rows"]) - len(candidates),
        "by_source": dict(Counter(r["source"] for r in selected)),
    }
    if reference:
        selection.update(reference_id=reference["id"], reference_name=reference["name"], **distribution)
    elif body.method == "balanced_mix":
        selection.update(distribution)
    fingerprint = hashlib.sha256(
        json.dumps(selected, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
    return {
        "id": s.uid(),
        "workspace_id": body.workspace_id,
        "name": body.name,
        "created_at": s.now(),
        "kind": "reconstruction",
        "schema_id": next(iter(schema_ids)),
        "rows": selected,
        "parent_ids": [d["id"] for d in parents],
        "fingerprint": fingerprint,
        "settings": body.model_dump(),
        "selection": selection,
        "provenance": "원본 레이블·분할 유지" if legacy else "학습 데이터 재구성",
    }


@app.post("/api/reconstructions/preview")
def preview(body: Reconstruction):
    return s.public_dataset(reconstruct(body))


@app.post("/api/reconstructions", status_code=201)
def create_reconstruction(body: Reconstruction):
    with s.db() as con:
        con.execute("BEGIN IMMEDIATE")
        dataset = reconstruct(body, con)
        if body.workspace_id is None:
            # Validate reconstruction first, then publish both objects atomically.
            workspace = Workspace(name=body.name).model_dump() | {
                "id": s.uid(), "created_at": s.now()
            }
            s.save("workspace", workspace, con)
            dataset["workspace_id"] = workspace["id"]
        return s.public_dataset(wd.publish(dataset, con))


@app.get("/api/models")
def models(summary: bool = False):
    fields = {
        "id",
        "name",
        "schema_id",
        "family",
        "kind",
        "status",
        "created_at",
        "training_job_id",
        "dataset_id",
        "parent_id",
    }
    return [
        ({k: v for k, v in m.items() if k in fields} if summary else m)
        | {"available": model_available(m)}
        for m in s.all_of("model")
    ]


@app.patch("/api/models/{mid}")
def rename_model(mid: str, body: Rename):
    return s.patch("model", mid, **body.model_dump(exclude_unset=True))


@app.get("/api/models/{mid}")
def model(mid: str):
    m = s.get("model", mid)
    return m | {"available": model_available(m)}


@app.post("/api/jobs", status_code=201)
def create_job(body: Job):
    d = s.get("dataset", body.dataset_id)
    if body.kind == "labeling":
        if body.model_id is None:
            body = body.model_copy(update={"model_id": workspace_labeling_model(s.get("workspace", d["workspace_id"]), d)})
        schema_id = d.get("schema_id", taxonomy.LEGACY)
        taxonomy.schema(schema_id)
        if not d["rows"]:
            raise ValueError("이미지를 먼저 업로드하세요.")
        if body.reference_id:
            raise ValueError("자동 레이블링에는 비교 데이터셋이 필요하지 않습니다.")
        selected_labeling_model(body.model_id, schema_id)
    elif body.kind == "drift":
        if not body.reference_id or body.reference_id == body.dataset_id:
            raise ValueError("서로 다른 비교 데이터셋을 선택하세요.")
        ref = s.get("dataset", body.reference_id)
        require_labels(d)
        require_labels(ref)
        if ref.get("schema_id", taxonomy.LEGACY) != d.get("schema_id", taxonomy.LEGACY):
            raise ValueError("같은 레이블 기준의 데이터셋끼리 비교하세요.")
        if not d["rows"] or not ref["rows"]:
            raise ValueError("Empty comparison dataset")
    else:
        require_labels(d)
        if not body.model_id:
            raise ValueError("모델을 선택하세요.")
        m = s.get("model", body.model_id)
        if m["kind"] == "lora" and m.get("schema_id", taxonomy.LEGACY) != d.get(
            "schema_id", taxonomy.LEGACY
        ):
            raise ValueError(
                "모델과 데이터셋의 레이블 기준이 다릅니다. 동일 기준 모델 또는 기본 모델을 선택하세요."
            )
        if m["status"] != "ready":
            raise ValueError("보관된 모델은 사용할 수 없습니다.")
        if not model_available(m):
            raise ValueError("기본 모델 또는 LoRA 어댑터 파일이 서버에 없습니다.")
        partition = "train" if body.kind == "training" else body.split
        if not any(r["split"] == partition for r in d["rows"]):
            raise ValueError("Selected split is empty")
    job = {
        "id": s.uid(),
        "created_at": s.now(),
        "status": "queued",
        "progress": {},
        "request": body.model_dump(),
        "dataset_fingerprint": d["fingerprint"],
        "cancel_requested": False,
        "result": None,
        "error": None,
    }
    with s.db() as con:
        con.execute("BEGIN IMMEDIATE")
        # Recheck under the deletion/queue lock so deleted inputs cannot be queued.
        s.get("dataset", body.dataset_id, con)
        if body.reference_id:
            s.get("dataset", body.reference_id, con)
        if body.kind == "labeling" and any(
            j["request"]["kind"] == "labeling"
            and j["request"]["dataset_id"] == body.dataset_id
            and j["status"] in ("queued", "running")
            for j in s.all_of("job", con)
        ):
            raise HTTPException(
                409, "이 데이터셋의 자동 레이블링이 이미 진행 중입니다."
            )
        return s.save("job", job, con)


def named_jobs(values):
    datasets = {d["id"]: d for d in s.dataset_summaries()}
    workspaces = {w["id"]: w["name"] for w in s.all_of("workspace")}
    for j in values:
        for prefix, key in (("dataset", "dataset_id"), ("reference", "reference_id")):
            d = datasets.get(j["request"].get(key))
            if d:
                j[prefix + "_name"] = workspaces.get(d["workspace_id"], d["name"])
                j[prefix + "_workspace_id"] = d["workspace_id"]
        j.pop("input_row", None)
    return values


@app.get("/api/jobs")
def jobs(
    kind: Literal["training", "evaluation", "drift", "labeling", "inference"]
    | None = None,
    summary: bool = False,
):
    if summary:
        return named_jobs(s.job_summaries(kind))
    return named_jobs(
        [j for j in s.all_of("job") if kind is None or j["request"]["kind"] == kind]
    )


@app.get("/api/jobs/{jid}")
def job(jid: str):
    return named_jobs([s.get("job", jid)])[0]


@app.post("/api/jobs/{jid}/cancel")
def cancel(jid: str):
    with s.db() as c:
        c.execute("BEGIN IMMEDIATE")
        j = s.get("job", jid, c)
        if j["status"] not in ("queued", "running"):
            raise HTTPException(409, "종료된 작업입니다.")
        j["cancel_requested"] = True
        if j["status"] == "queued":
            j.update(status="cancelled", finished_at=s.now())
        return s.save("job", j, c)


@app.get("/api/jobs/{jid}/logs")
def logs(jid: str):
    s.get("job", jid)
    file = s.ROOT / "jobs" / jid / "process.log"
    return {"text": file.read_text(errors="replace")[-60000:] if file.exists() else ""}


@app.get("/api/jobs/{jid}/events")
async def events(jid: str, request: Request):
    s.get("job", jid)

    async def stream():
        while not await request.is_disconnected():
            j = s.get("job", jid)
            yield "data: " + json.dumps(j, ensure_ascii=False) + "\n\n"
            if j["status"] not in ("queued", "running"):
                break
            await asyncio.sleep(2)

    return StreamingResponse(
        stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )
