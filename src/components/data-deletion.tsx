"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { displayName } from "@/lib/utils";

export type DeleteTarget = {
  kind: "workspace" | "dataset" | "samples";
  id: string;
  sample_ids?: string[];
};
type Entry = {
  id: string;
  kind: DeleteTarget["kind"];
  name: string;
  sample_count: number;
  dataset_count: number;
  workspace_id: string;
  remaining_count: number;
  deleted_at: string;
  replacement_id?: string;
};
type Preview = Entry & { token: string };
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    "/api/deletions" + path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "요청을 처리하지 못했습니다.",
    );
  return data;
}
const titles = {
  workspace: "워크스페이스 삭제",
  dataset: "전체 데이터 삭제",
  samples: "선택 이미지 삭제",
};
export function DeleteDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: DeleteTarget;
  onClose: () => void;
  onDeleted: (result: { dataset?: { id: string } | null }) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    let alive = true;
    request<Preview>("/preview", target)
      .then((p) => {
        if (alive) setPreview(p);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [target]);
  async function submit() {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await request<{ dataset?: { id: string } | null }>("", {
        ...target,
        token: preview.token,
      });
      onDeleted(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="workspace-dialog"
      aria-labelledby="deletion-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <h2 id="deletion-title">{titles[target.kind]}</h2>
        <button onClick={onClose} disabled={busy} aria-label="삭제 창 닫기">
          <X size={20} />
        </button>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!preview && !error && (
          <p role="status">삭제 대상을 확인하고 있습니다.</p>
        )}
        {preview && (
          <>
            <dl className="details">
              <dt>대상</dt>
              <dd>{displayName(preview.name)}</dd>
              <dt>
                {target.kind === "samples" ? "선택 이미지" : "포함 이미지"}
              </dt>
              <dd>{preview.sample_count.toLocaleString()}개</dd>
            </dl>
            <p className="result-note">
              {target.kind === "workspace"
                ? "워크스페이스와 그 안의 이미지, 레이블을 삭제 목록으로 이동합니다."
                : target.kind === "dataset"
                  ? "이 워크스페이스의 이미지와 레이블을 모두 삭제 목록으로 이동합니다."
                  : preview.remaining_count
                    ? `선택한 이미지와 레이블을 삭제합니다. ${preview.remaining_count}개 이미지는 유지됩니다.`
                    : "전체 이미지를 선택했습니다. 이미지와 레이블을 삭제 목록으로 이동합니다."}
            </p>
            <p className="result-note">
              삭제 목록에서 복원할 수 있습니다. 이미지 원본 파일, 기존 모델과
              작업 결과는 보관됩니다.
            </p>
            {target.kind === "workspace" && (
              <label className="field">
                확인을 위해 워크스페이스 이름을 입력하세요
                <input
                  autoComplete="off"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={preview.name}
                  disabled={busy}
                />
              </label>
            )}
          </>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="button danger"
            disabled={
              !preview ||
              busy ||
              (target.kind === "workspace" && confirmation !== preview.name)
            }
          >
            {busy ? "삭제 중" : "삭제"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export function DeletedItems({
  onClose,
  onRestored,
}: {
  onClose: () => void;
  onRestored: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    let alive = true;
    request<Entry[]>("")
      .then((items) => {
        if (alive) setEntries(items);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function restore(entry: Entry) {
    setBusy(entry.id);
    setError("");
    setNotice("");
    try {
      await request("/" + entry.id + "/restore", {});
      setEntries((items) => items.filter((item) => item.id !== entry.id));
      setNotice(`${displayName(entry.name)} 복원했습니다.`);
      onRestored();
    } catch (e) {
      setError(e instanceof Error ? e.message : "복원하지 못했습니다.");
    } finally {
      setBusy("");
    }
  }
  return (
    <dialog
      ref={dialog}
      className="workspace-dialog"
      aria-labelledby="deleted-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <h2 id="deleted-title">삭제 목록</h2>
        <button onClick={onClose} disabled={!!busy} aria-label="삭제 목록 닫기">
          <X size={20} />
        </button>
      </header>
      <div className="deleted-content">
        <p className="result-note">
          삭제한 이미지와 레이블을 복원합니다. 현재 데이터의 수정 내용은
          유지됩니다.
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {loading ? (
          <p>불러오는 중입니다.</p>
        ) : entries.length ? (
          <ul className="deleted-items">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{displayName(entry.name)}</strong>
                  <p>
                    {titles[entry.kind]} / {entry.sample_count.toLocaleString()}
                    개
                  </p>
                  <time dateTime={entry.deleted_at}>
                    {new Date(entry.deleted_at).toLocaleString("ko-KR")}
                  </time>
                </div>
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => void restore(entry)}
                >
                  {busy === entry.id ? "복원 중" : "복원"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>삭제한 항목이 없습니다.</p>
        )}
      </div>
    </dialog>
  );
}
