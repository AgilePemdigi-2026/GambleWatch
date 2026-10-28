"""Keep the test suite offline and deterministic.

KeywordProvider reads Supabase credentials from the environment and from
.env.local. Tests must never depend on (or write to) a live database, so both
sources are switched off before any test module is imported.
"""

import os

os.environ["GAMBLEWATCH_NO_ENV_FILE"] = "1"
for name in ("SUPABASE_URL", "SUPABASE_KEY"):
    os.environ.pop(name, None)
