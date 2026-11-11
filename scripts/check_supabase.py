#!/usr/bin/env python3
"""Check the Supabase connection used by the detection engine (DET-04).

Run from the repo root:
    python scripts/check_supabase.py

Reads SUPABASE_URL / SUPABASE_KEY (or NEXT_PUBLIC_SUPABASE_URL /
NEXT_PUBLIC_SUPABASE_ANON_KEY) from the environment or .env.local, then
reads the `keywords` table. The key is never printed.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from detection_engine.config.env import load_env_files  # noqa: E402


def main() -> int:
    load_env_files()
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")

    print(f"URL        : {url or '(belum diisi)'}")
    print(f"API key    : {'terisi (' + str(len(key)) + ' karakter)' if key else '(belum diisi)'}")
    if not url or not key:
        print("\nBelum bisa terhubung. Isi NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local "
              "(Supabase Dashboard -> Project Settings -> API -> anon public).")
        return 2

    try:
        from supabase import create_client
    except ImportError:
        print("\nPaket 'supabase' belum terpasang: pip install supabase")
        return 2

    try:
        client = create_client(url, key)
        rows = (client.table("keywords")
                .select("term, weight, active, language")
                .eq("active", True)
                .execute().data or [])
    except Exception as e:  # report the cause, never the key
        message = str(e)
        print(f"\nGAGAL membaca tabel 'keywords': {message[:300]}")
        lowered = message.lower()
        if "invalid api key" in lowered or "jwt" in lowered or "401" in lowered:
            print("-> Kunci salah atau terpotong. Salin ulang kunci 'anon public'.")
        elif "pgrst205" in lowered or "does not exist" in lowered or "could not find the table" in lowered:
            print("-> Tabel belum dibuat. Jalankan supabase/schema.sql di SQL Editor.")
        elif "permission denied" in lowered or "42501" in lowered:
            print("-> Row Level Security menolak. Jalankan ulang supabase/schema.sql "
                  "(policy 'read active keywords').")
        return 1

    if not rows:
        print("\nTerhubung, tapi tabel 'keywords' kosong atau tidak ada baris aktif. "
              "Jalankan supabase/seed_keywords.sql di SQL Editor.")
        return 1

    languages = sorted({r.get("language") or "id" for r in rows})
    print(f"\nTERHUBUNG. {len(rows)} kata kunci aktif dibaca dari Supabase "
          f"(bahasa: {', '.join(languages)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
