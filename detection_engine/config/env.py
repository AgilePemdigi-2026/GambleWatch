"""Load KEY=VALUE settings from .env.local / .env without extra dependencies.

The Next.js frontend and the Python engine share one `.env.local`, so the
Python side also accepts the frontend's names:

    SUPABASE_URL  <- NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_KEY  <- NEXT_PUBLIC_SUPABASE_ANON_KEY

Variables already set in the real environment always win. Set
GAMBLEWATCH_NO_ENV_FILE=1 to skip file loading (the test suite does this so
tests never depend on a live database).
"""

import os
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[2]
ENV_FILES = (".env.local", ".env")
ALIASES = {
    "SUPABASE_URL": "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_KEY": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
}


def _parse(line: str):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        return None
    key, _, value = line.partition("=")
    key, value = key.strip(), value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    return (key, value) if key and value else None


def load_env_files(root: Optional[Path] = None) -> None:
    """Populate os.environ from .env.local then .env (never overriding)."""
    if os.environ.get("GAMBLEWATCH_NO_ENV_FILE"):
        return

    base = Path(root) if root else ROOT
    for name in ENV_FILES:
        path = base / name
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            parsed = _parse(raw)
            if parsed and parsed[0] not in os.environ:
                os.environ[parsed[0]] = parsed[1]

    for target, source in ALIASES.items():
        if not os.environ.get(target) and os.environ.get(source):
            os.environ[target] = os.environ[source]
