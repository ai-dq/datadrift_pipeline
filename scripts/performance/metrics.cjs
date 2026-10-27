const average = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
function summarize(samples, targetMs) {
  const values = samples
    .filter((s) => s.ok)
    .map((s) => s.durationMs)
    .sort((a, b) => a - b);
  const failures = samples.length - values.length;
  return {
    attempts: samples.length,
    successes: values.length,
    failures,
    meanMs: average(values),
    p50Ms: values.length ? values[Math.ceil(values.length * 0.5) - 1] : null,
    p95Ms: values.length ? values[Math.ceil(values.length * 0.95) - 1] : null,
    maxMs: values.length ? values.at(-1) : null,
    overTarget: values.filter((v) => v > targetMs).length,
    targetMet:
      values.length > 0 && failures === 0 && average(values) <= targetMs,
  };
}
// Runs inside Chromium. Conditions are explicit content/API contracts, not networkidle.
async function renderedReady({ conditions, timeoutMs, action = false }) {
  const start = action ? window.__benchmarkActionStart : 0;
  if (action && !Number.isFinite(start))
    throw new Error("Action start event was not recorded");
  const deadline = performance.now() + timeoutMs;
  const decoded = new WeakSet(),
    decoding = new WeakSet();
  let imageError = "",
    frames = 0;
  const visible = (el) => !!el && el.getClientRects().length > 0;
  const resources = () =>
    performance
      .getEntriesByType("resource")
      .filter((r) => r.startTime >= start);
  let missing = [];
  while (performance.now() < deadline) {
    const alerts = [...document.querySelectorAll(".alert.error")]
      .filter(visible)
      .map((e) => e.textContent.trim())
      .filter(Boolean);
    if (alerts.length) throw new Error("UI error: " + alerts.join("; "));
    const images = [
      ...document.querySelectorAll('main img, [role="dialog"] img'),
    ];
    // Include EVERY image on the current paginated page, even below the fold.
    // Eager loading is a documented conservative probe; no other pages are fetched.
    for (const im of images) {
      if (im.loading === "lazy") im.loading = "eager";
      if (im.complete && im.naturalWidth === 0)
        imageError = "Broken image: " + im.getAttribute("src");
      if (im.complete && im.naturalWidth > 0 && !decoding.has(im)) {
        decoding.add(im);
        im.decode()
          .then(() => decoded.add(im))
          .catch((e) => {
            imageError = e.message;
          });
      }
    }
    if (imageError) throw new Error(imageError);
    missing = conditions.filter((c) => {
      if (c.api)
        return !resources().some(
          (r) => new URL(r.name).pathname === c.api && r.responseEnd > 0,
        );
      const els = [...document.querySelectorAll(c.selector)];
      if (c.count != null && els.length !== c.count) return true;
      if (c.min != null && els.length < c.min) return true;
      if (c.text != null && !els.some((e) => e.textContent.includes(c.text)))
        return true;
      if (
        c.textLength != null &&
        !els.some((e) => e.textContent.length === c.textLength)
      )
        return true;
      if (c.enabled && !els.some((e) => !e.disabled)) return true;
      if (c.visible && !els.some(visible)) return true;
      return false;
    });
    const ready =
      document.readyState === "complete" &&
      document.visibilityState === "visible" &&
      ![...document.querySelectorAll("main .loading")].some(visible) &&
      document.fonts.status === "loaded" &&
      images.every((im) => decoded.has(im)) &&
      !missing.length;
    frames = ready ? frames + 1 : 0;
    if (frames >= 3) {
      const end = performance.now();
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        durationMs: end - start,
        startMs: start,
        endMs: end,
        imageCount: images.length,
        imagePolicy:
          "all images on current pagination page, forced eager + decoded",
        navigation: action
          ? null
          : {
              ttfbMs: nav?.responseStart,
              loadEventEndMs: nav?.loadEventEnd,
              domContentLoadedMs: nav?.domContentLoadedEventEnd,
            },
        api: resources()
          .filter((r) => new URL(r.name).pathname.startsWith("/api/"))
          .map((r) => ({
            path: new URL(r.name).pathname,
            durationMs: r.duration,
            transferSize: r.transferSize,
          })),
      };
    }
    await new Promise(requestAnimationFrame);
  }
  throw new Error("Render timeout; missing=" + JSON.stringify(missing));
}
module.exports = { summarize, renderedReady };
