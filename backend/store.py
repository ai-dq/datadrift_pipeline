"""Durable single-host catalog and job queue (SQLite WAL)."""

import contextlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("DATADRIFT_STATE", ".runtime")).resolve()


def now():
    return datetime.now(timezone.utc).isoformat()


def uid():
    return uuid.uuid4().hex


@contextlib.contextmanager
def db():
    ROOT.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(ROOT / "catalog.sqlite", timeout=30)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute(
        "CREATE TABLE IF NOT EXISTS objects (kind TEXT, id TEXT, body TEXT, PRIMARY KEY(kind,id))"
    )
    try:
        yield con
        con.commit()
    except BaseException:
        con.rollback()
        raise
    finally:
        con.close()


def save(kind, value, con=None):
    if con is None:
        with db() as c:
            return save(kind, value, c)
    con.execute(
        "INSERT INTO objects VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body",
        (kind, value["id"], json.dumps(value, ensure_ascii=False)),
    )
    return value


def get(kind, key, con=None):
    if con is None:
        with db() as c:
            return get(kind, key, c)
    row = con.execute(
        "SELECT body FROM objects WHERE kind=? AND id=?", (kind, key)
    ).fetchone()
    if row is None:
        raise KeyError(f"{kind} not found: {key}")
    return json.loads(row["body"])


def all_of(kind, con=None):
    if con is None:
        with db() as c:
            return all_of(kind, c)
    return [
        json.loads(r["body"])
        for r in con.execute(
            "SELECT body FROM objects WHERE kind=? ORDER BY rowid DESC", (kind,)
        )
    ]


def patch(kind, key, **fields):
    with db() as c:
        c.execute("BEGIN IMMEDIATE")
        obj = get(kind, key, c)
        obj.update(fields)
        return save(kind, obj, c)


def rows(dataset):
    return dataset["rows"]


def counts(dataset):
    from collections import Counter

    return dict(Counter(r["split"] for r in rows(dataset)))


def public_dataset(d):
    return {k: v for k, v in d.items() if k != "rows"} | {
        "count": len(d["rows"]),
        "splits": counts(d),
    }


def initialize_read_indexes():
    """Derived indexes; triggers keep API, worker and direct SQL writes consistent."""
    summary = """json_set(json_remove(new.body, '$.rows'),
        '$.count', json_array_length(new.body, '$.rows'),
        '$.splits', json((SELECT json_group_object(split, n) FROM (
            SELECT json_extract(value, '$.split') AS split, count(*) AS n
            FROM json_each(new.body, '$.rows') GROUP BY split))))"""
    with db() as c:
        c.execute(
            "CREATE TABLE IF NOT EXISTS dataset_summaries (id TEXT PRIMARY KEY, body TEXT NOT NULL)"
        )
        c.execute("""CREATE TABLE IF NOT EXISTS dataset_images (
            dataset_id TEXT, sample_id TEXT, image TEXT,
            PRIMARY KEY(dataset_id, sample_id))""")
        for event in ("INSERT", "UPDATE"):
            c.execute(f"""CREATE TRIGGER IF NOT EXISTS dataset_index_{event.lower()}
                AFTER {event} ON objects WHEN new.kind='dataset' BEGIN
                DELETE FROM dataset_summaries WHERE id=new.id;
                INSERT INTO dataset_summaries VALUES (new.id, {summary});
                DELETE FROM dataset_images WHERE dataset_id=new.id;
                INSERT INTO dataset_images
                    SELECT new.id, json_extract(value, '$.id'), json_extract(value, '$.image')
                    FROM json_each(new.body, '$.rows') WHERE true
                    ON CONFLICT(dataset_id, sample_id) DO NOTHING;
                END""")
        c.execute("""CREATE TRIGGER IF NOT EXISTS dataset_index_delete
            AFTER DELETE ON objects WHEN old.kind='dataset' BEGIN
            DELETE FROM dataset_summaries WHERE id=old.id;
            DELETE FROM dataset_images WHERE dataset_id=old.id;
            END""")
        # Backfill existing catalogs through the same transaction/trigger path.
        c.execute("""UPDATE objects SET body=body WHERE kind='dataset'
            AND id NOT IN (SELECT id FROM dataset_summaries)""")


def dataset_summaries(workspace_id=None, dataset_id=None):
    with db() as c:
        rows = c.execute(
            """SELECT d.body FROM dataset_summaries d
            JOIN objects o ON o.kind='dataset' AND o.id=d.id
            WHERE (? IS NULL OR json_extract(d.body, '$.workspace_id')=?)
              AND (? IS NULL OR d.id=?) ORDER BY o.rowid DESC""",
            (workspace_id, workspace_id, dataset_id, dataset_id),
        )
        return [json.loads(r["body"]) for r in rows]


def image_path(dataset_id, sample_id):
    with db() as c:
        row = c.execute(
            "SELECT image FROM dataset_images WHERE dataset_id=? AND sample_id=?",
            (dataset_id, sample_id),
        ).fetchone()
    if row is None or not row["image"]:
        raise KeyError(f"Image not found: {sample_id}")
    return row["image"]


def job_summaries(kind=None):
    with db() as c:
        return [
            json.loads(r[0])
            for r in c.execute(
                """
            SELECT json_remove(body, '$.result', '$.progress.history') FROM objects
            WHERE kind='job' AND (? IS NULL OR json_extract(body, '$.request.kind')=?)
            ORDER BY rowid DESC""",
                (kind, kind),
            )
        ]
