"""Descriptive domain drift; categorical JS divergence and RGB histogram distance."""

from collections import Counter
import numpy as np
from PIL import Image, ImageOps
from . import taxonomy


def js(a, b):
    keys = sorted(set(a) | set(b))
    p = np.array([a.get(k, 0) for k in keys], dtype=float)
    q = np.array([b.get(k, 0) for k in keys], dtype=float)
    p /= p.sum()
    q /= q.sum()
    m = (p + q) / 2

    def kl(x):
        mask = x > 0
        return float(np.sum(x[mask] * np.log2(x[mask] / m[mask])))

    return (kl(p) + kl(q)) / 2


def histogram(rows):
    counts = np.zeros(24, dtype=float)
    for row in rows:
        with Image.open(row["image"]) as im:
            pixels = np.asarray(
                ImageOps.exif_transpose(im).convert("RGB").resize((32, 32))
            )
        for channel in range(3):
            counts[channel * 8 : (channel + 1) * 8] += np.histogram(
                pixels[:, :, channel], bins=8, range=(0, 256)
            )[0]
    return {str(i): float(n) for i, n in enumerate(counts)}


def detect(reference, current, threshold):
    fields = []
    schema_id = reference[0].get("schema_id", taxonomy.LEGACY)
    for field in taxonomy.schema(schema_id):

        def counts(rows):
            result = Counter()
            for r in rows:
                if field in r.get("unscored_fields", []):
                    continue
                value = r["target"].get(field)
                if value in (None, "unknown"):
                    continue
                result[str(sorted(value) if isinstance(value, list) else value)] += 1
            return result

        a, b = counts(reference), counts(current)
        if not a or not b:
            continue
        score = js(a, b)
        fields.append(
            {
                "field": field,
                "js_divergence": score,
                "detected": score >= threshold,
                "reference": dict(a),
                "current": dict(b),
            }
        )
    image_score = js(histogram(reference), histogram(current))
    return {
        "comparison": "source/domain",
        "reference_count": len(reference),
        "current_count": len(current),
        "threshold": threshold,
        "fields": sorted(fields, key=lambda f: f["js_divergence"], reverse=True),
        "image_histogram_js": image_score,
        "detected": image_score >= threshold or any(f["detected"] for f in fields),
        "note": "출처 간 분포 차이입니다. 시간 경과에 따른 성능 저하나 통계적 유의성을 의미하지 않습니다. AI 레이블 생성 방식 차이도 포함될 수 있습니다.",
    }
