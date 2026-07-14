"""Durable JSON-document storage backed by PostgreSQL when DATABASE_URL is set.

The application still works with local JSON files for development. In hosted
environments each former JSON file becomes a row in ``portal_store`` so deploys
and restarts do not erase operational data.
"""

from __future__ import annotations

import json
import os
import threading
import time
from copy import deepcopy

from sqlalchemy import BigInteger, Column, MetaData, String, Table, Text, create_engine, select


DATABASE_URL = str(os.getenv("DATABASE_URL", "") or "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

_engine = create_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
_metadata = MetaData()
_store = Table(
    "portal_store",
    _metadata,
    Column("key", String(160), primary_key=True),
    Column("payload", Text, nullable=False),
    Column("updated_at", BigInteger, nullable=False),
)
_lock = threading.RLock()

if _engine is not None:
    _metadata.create_all(_engine)


def database_enabled() -> bool:
    return _engine is not None


def database_health() -> bool:
    if _engine is None:
        return True
    with _engine.connect() as connection:
        connection.execute(select(_store.c.key).limit(1))
    return True


def _key(path: str) -> str:
    return os.path.basename(path).lower()


def read_document(path: str, default):
    if _engine is None:
        return None
    with _lock, _engine.connect() as connection:
        value = connection.execute(
            select(_store.c.payload).where(_store.c.key == _key(path))
        ).scalar_one_or_none()
    if value is None:
        return deepcopy(default)
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return deepcopy(default)


def write_document(path: str, payload) -> None:
    if _engine is None:
        raise RuntimeError("Database storage is not enabled")
    serialized = json.dumps(payload, ensure_ascii=True, separators=(",", ":"))
    key = _key(path)
    now = int(time.time() * 1000)
    with _lock, _engine.begin() as connection:
        existing = connection.execute(
            select(_store.c.key).where(_store.c.key == key).with_for_update()
        ).scalar_one_or_none()
        if existing is None:
            connection.execute(_store.insert().values(key=key, payload=serialized, updated_at=now))
        else:
            connection.execute(
                _store.update().where(_store.c.key == key).values(payload=serialized, updated_at=now)
            )


def ensure_document(path: str, default) -> None:
    if _engine is None:
        return
    key = _key(path)
    with _lock, _engine.begin() as connection:
        existing = connection.execute(
            select(_store.c.key).where(_store.c.key == key).with_for_update()
        ).scalar_one_or_none()
        if existing is None:
            connection.execute(
                _store.insert().values(
                    key=key,
                    payload=json.dumps(default, ensure_ascii=True, separators=(",", ":")),
                    updated_at=int(time.time() * 1000),
                )
            )
