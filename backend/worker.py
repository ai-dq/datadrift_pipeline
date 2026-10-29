"""One persistent worker; durable queue, cancellation, restart recovery, serialized GPU jobs."""

import fcntl
import hashlib
import json
import os
import signal
import subprocess
import sys
import time
from . import store as s
from . import taxonomy
from . import workspace_data as wd
from .catalog import model_path
from .drift import detect


def claim():
    with s.db() as c:
        c.execute("BEGIN IMMEDIATE")
        jobs = sorted(s.all_of("job", c), key=lambda j: j["created_at"])
        for j in jobs:
            if j["status"] == "queued" and not j["cancel_requested"]:
                j.update(status="running", started_at=s.now())
                s.save("job", j, c)
                return j


def run(j):
    jid = j["id"]
    req = j["request"]
    inference = req["kind"] == "inference"
    dataset = (
        {
            "id": j["id"],
            "rows": [j["input_row"]],
            "schema_id": taxonomy.CURRENT,
            "fingerprint": j["input_row"]["sha256"],
        }
        if inference
        else s.get("dataset", req["dataset_id"])
    )
    if not inference and dataset["fingerprint"] != j["dataset_fingerprint"]:
        raise ValueError("Dataset snapshot changed")
    if req["kind"] == "drift":
        result = detect(
            s.get("dataset", req["reference_id"])["rows"],
            dataset["rows"],
            req["threshold"],
        )
        if s.get("job", jid)["cancel_requested"]:
            s.patch("job", jid, status="cancelled", finished_at=s.now())
        else:
            s.patch("job", jid, status="succeeded", result=result, finished_at=s.now())
        return
    labeling = req["kind"] == "labeling"
    fixed_teacher = labeling and req.get("model_id") in (None, "gemma4_teacher")
    model = {} if fixed_teacher else s.get("model", req["model_id"])
    rows = [
        r
        for r in dataset["rows"]
        if labeling
        or inference
        or r["split"] == ("train" if req["kind"] == "training" else req["split"])
    ]
    folder = s.ROOT / "jobs" / jid
    folder.mkdir(parents=True, exist_ok=True)
    prompt = model.get("prompt")
    if not prompt and model.get("training_job_id"):
        prompt = (s.get("job", model["training_job_id"]).get("result") or {}).get(
            "prompt"
        )
    payload = {
        "prompt": prompt,
        "schema_id": dataset.get("schema_id", taxonomy.LEGACY),
        "request": req,
        "model": model,
        "base_model": None if fixed_teacher else str(model_path(model["family"])),
        "rows": rows,
        "output": str(folder),
        "dataset_fingerprint": dataset["fingerprint"],
        "dataset_id": dataset["id"],
        "created_at": j["created_at"],
    }
    (folder / "input.json").write_text(json.dumps(payload, ensure_ascii=False))
    python = os.environ.get("DATADRIFT_TRAIN_PYTHON", sys.executable)
    env = os.environ.copy()
    env.update(
        CUDA_VISIBLE_DEVICES=os.environ.get("DATADRIFT_GPU", "0"),
        TOKENIZERS_PARALLELISM="false",
    )
    process = None
    process_started = time.monotonic()
    s.patch(
        "job",
        jid,
        progress={
            "phase": "loading",
            "step": 0,
            "total": len(rows)
            if labeling or inference
            else req["max_steps"]
            if req["kind"] == "training"
            else min(req.get("sample_limit") or len(rows), len(rows)),
            "elapsed_seconds": 0,
        },
    )
    try:
        with (folder / "process.log").open("w") as log:
            process = subprocess.Popen(
                [
                    python,
                    "-m",
                    "backend.relabeling" if fixed_teacher else "backend.training",
                    str(folder / "input.json"),
                ],
                stdout=log,
                stderr=subprocess.STDOUT,
                env=env,
                start_new_session=True,
            )
            while process.poll() is None:
                if s.get("job", jid)["cancel_requested"]:
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=15)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
                    s.patch("job", jid, status="cancelled", finished_at=s.now())
                    return
                progress = folder / "progress.json"
                if progress.exists():
                    try:
                        value = json.loads(progress.read_text())
                        value["elapsed_seconds"] = round(
                            time.monotonic() - process_started, 2
                        )
                        s.patch("job", jid, progress=value)
                    except json.JSONDecodeError:
                        pass
                time.sleep(1)
        if process.returncode:
            raise RuntimeError(
                f"모델 실행 프로세스 종료 코드 {process.returncode}. 실행 로그를 확인하세요."
            )
        result = json.loads((folder / "result.json").read_text())
        with s.db() as c:
            c.execute("BEGIN IMMEDIATE")
            latest = s.get("job", jid, c)
            if latest["cancel_requested"]:
                latest.update(status="cancelled", finished_at=s.now())
            else:
                if inference:
                    row = json.loads((folder / "relabeled-rows.json").read_text())[0]
                    result = {
                        "category": row.get("category"),
                        "category_valid": row["ai_label"]["category_valid"],
                        "attributes": row["target"],
                        "excluded_attributes": row["unscored_fields"],
                        "schema_valid": row["ai_label"]["schema_valid"],
                        "parse_valid": row["ai_label"]["parsed"] is not None,
                        "raw": row["ai_label"]["raw"],
                        "model_id": model["id"],
                        "schema_id": taxonomy.CURRENT,
                        "processing_seconds": round(
                            time.monotonic() - process_started, 2
                        ),
                        "teacher": result["teacher"],
                    }
                if labeling:
                    rows = json.loads((folder / "relabeled-rows.json").read_text())
                    if len(rows) != len(dataset["rows"]):
                        raise ValueError("Incomplete relabeling result")
                    did = "relabeled-" + jid
                    labeled = {
                        **dataset,
                        "id": did,
                        "name": dataset["name"] + " 자동 레이블",
                        "kind": "ai_relabel",
                        "schema_id": dataset.get("schema_id", taxonomy.LEGACY),
                        "rows": rows,
                        "created_at": s.now(),
                        "parent_ids": [dataset["id"]],
                        "labeling_job_id": jid,
                        "provenance": (model.get("name") or "Gemma-4-12B")
                        + " 자동 레이블링, 사람 검토 전",
                        "labeling_model_id": req.get("model_id") or "gemma4_teacher",
                        "fingerprint": hashlib.sha256(
                            json.dumps(
                                rows, sort_keys=True, ensure_ascii=False
                            ).encode()
                        ).hexdigest(),
                        "label_coverage": result["label_coverage"],
                        "teacher": result["teacher"],
                    }
                    labeled.pop("annotation_base_name", None)
                    s.save("dataset", labeled, c)
                    active, applied = wd.apply_labels(dataset, labeled, c)
                    result["dataset_id"] = active["id"] if active else did
                    result["applied_count"] = applied
                    result["skipped_changed_count"] = len(rows) - applied
                    if active and applied == len(rows) == len(active["rows"]) and applied > 0 and all(row.get("label_state") != "unlabeled" for row in active["rows"]):
                        workspace = s.get("workspace", dataset["workspace_id"], c)
                        workspace["labeling_model_id"] = labeled["labeling_model_id"]
                        s.save("workspace", workspace, c)
                if req["kind"] == "training":
                    mid = "trained-" + jid
                    s.save(
                        "model",
                        {
                            "id": mid,
                            "name": model["name"] + " · " + jid[:6],
                            "family": model["family"],
                            "kind": "lora",
                            "status": "ready",
                            "adapter": str(folder / "adapter"),
                            "created_at": s.now(),
                            "training_job_id": jid,
                            "dataset_id": dataset["id"],
                            "parent_id": model["id"],
                            "schema_id": result.get("schema_id", taxonomy.LEGACY),
                            "taxonomy_snapshot": result.get("taxonomy_snapshot"),
                            "prompt": result["prompt"],
                            "prompt_sha256": result["prompt_sha256"],
                        },
                        c,
                    )
                    result["model_id"] = mid
                latest.update(
                    status="succeeded",
                    finished_at=s.now(),
                    result=result,
                    progress=json.loads((folder / "progress.json").read_text())
                    | {"elapsed_seconds": round(time.monotonic() - process_started, 2)},
                )
            s.save("job", latest, c)
    finally:
        if process is not None and process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()


def main():
    s.ROOT.mkdir(parents=True, exist_ok=True)
    with (s.ROOT / "worker.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        # A terminated process is never reported as a successful or resumable training run.
        for j in s.all_of("job"):
            if j["status"] == "running":
                s.patch(
                    "job",
                    j["id"],
                    status="failed",
                    finished_at=s.now(),
                    error="Worker restarted; submit a new job. Previous artifacts preserved.",
                )
        while True:
            j = claim()
            if j is None:
                time.sleep(1)
                continue
            try:
                run(j)
            except Exception as exc:
                print(repr(exc), flush=True)
                s.patch(
                    "job", j["id"], status="failed", error=str(exc), finished_at=s.now()
                )


if __name__ == "__main__":
    main()
