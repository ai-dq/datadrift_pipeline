"use client";
import { useEffect, useState } from "react";

/** Tick independently of job progress; returning from a background tab catches up. */
export function RunElapsed({
  status,
  startedAt,
  finishedAt,
  elapsedSeconds = 0,
}: {
  status: string;
  startedAt?: string;
  finishedAt?: string;
  elapsedSeconds?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const running = status === "running";
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running, startedAt]);
  const start = Date.parse(startedAt || "");
  const end = Date.parse(finishedAt || "");
  const seconds =
    status === "queued"
      ? 0
      : Number.isFinite(start) && (running || Number.isFinite(end))
        ? ((running ? now : end) - start) / 1000
        : elapsedSeconds;
  return (
    <span data-testid="run-elapsed">
      {Math.max(
        0,
        Math.floor(Number.isFinite(seconds) ? seconds : 0),
      ).toLocaleString("ko-KR")}
      초
    </span>
  );
}
