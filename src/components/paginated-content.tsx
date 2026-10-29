"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export function StablePage({
  children,
  rows,
  layout = "table",
  loading = false,
  pageKey,
}: {
  children: ReactNode;
  rows: number;
  layout?: "table" | "results";
  loading?: boolean;
  pageKey?: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [pageKey]);
  return (
    <div
      className={`stable-page stable-${layout}-page`}
      style={{ "--page-rows": Math.max(1, rows) } as CSSProperties}
      aria-busy={loading}
      ref={viewport}
    >
      {children}
      {loading && (
        <span className="page-loading" role="status">
          불러오는 중…
        </span>
      )}
    </div>
  );
}

export function PaginatedContent<T>({
  items,
  label,
  children,
  pageSize = 10,
  layout = "table",
  page: controlledPage,
  onPageChange,
}: {
  items: T[];
  label: string;
  children: (items: T[], offset: number) => ReactNode;
  pageSize?: number;
  layout?: "table" | "results";
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(controlledPage ?? page, pages - 1);
  const offset = current * pageSize;
  useEffect(() => setPage((value) => Math.min(value, pages - 1)), [pages]);
  return (
    <div className="paged-content">
      {items.length ? (
        <StablePage
          rows={Math.min(items.length, pageSize)}
          layout={layout}
          pageKey={current}
        >
          {children(items.slice(offset, offset + pageSize), offset)}
        </StablePage>
      ) : (
        <p className="empty">표시할 항목이 없습니다.</p>
      )}
      <Pagination
        total={items.length}
        page={current}
        pageSize={pageSize}
        label={label}
        onPageChange={onPageChange || setPage}
      />
    </div>
  );
}

export function Pagination({
  total,
  page,
  pageSize = 10,
  label,
  onPageChange,
  disabled = false,
}: {
  total: number;
  page: number;
  pageSize?: number;
  label: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages - 1);
  const offset = current * pageSize;
  return (
    <>
      {total > 0 && (
        <nav className="list-pagination" aria-label={`${label} 페이지`}>
          <span>
            {(offset + 1).toLocaleString()}–
            {Math.min(offset + pageSize, total).toLocaleString()} /{" "}
            {total.toLocaleString()}개
          </span>
          {pages > 1 && (
            <div>
              <button
                className="button secondary"
                disabled={disabled || current === 0}
                onClick={() => onPageChange(current - 1)}
              >
                이전
              </button>
              <label>
                <span className="sr-only">{label} 페이지 선택</span>
                <select
                  disabled={disabled}
                  value={current}
                  onChange={(e) => onPageChange(Number(e.target.value))}
                >
                  {Array.from({ length: pages }, (_, index) => (
                    <option key={index} value={index}>
                      {index + 1} / {pages}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button secondary"
                disabled={disabled || current + 1 === pages}
                onClick={() => onPageChange(current + 1)}
              >
                다음
              </button>
            </div>
          )}
        </nav>
      )}
    </>
  );
}
