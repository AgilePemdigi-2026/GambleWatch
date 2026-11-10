"""KeywordProvider: Supabase source with local-file fallback (no network)."""

import json
from types import SimpleNamespace

import pytest

from detection_engine.detectors.det04_text_keyword.keyword_provider import KeywordProvider


class FakeSupabase:
    """Mimics client.table(...).select(...).eq(...).execute()."""

    def __init__(self, rows=None, error=None):
        self.rows, self.error = rows, error
        self.calls = []

    def table(self, name):
        self.calls.append(name)
        return self

    def select(self, columns):
        return self

    def eq(self, column, value):
        return self

    def execute(self):
        if self.error:
            raise self.error
        return SimpleNamespace(data=self.rows)


@pytest.fixture(autouse=True)
def no_supabase_env(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)


def make_provider(tmp_path, client=None, local=None, ttl=15):
    path = tmp_path / "keywords.json"
    if local is not None:
        path.write_text(json.dumps(local), encoding="utf-8")
    provider = KeywordProvider(local_fallback_path=str(path), cache_ttl_minutes=ttl)
    provider._supabase_client = client
    return provider


LOCAL = [{"term": "lokal", "category": "slot", "weight": 0.6, "active": True,
          "language": "id", "variations": [], "aliases": []}]


def test_without_credentials_no_client_is_created(tmp_path):
    provider = KeywordProvider(local_fallback_path=str(tmp_path / "k.json"))
    assert provider._supabase_client is None


def test_keywords_come_from_supabase_table(tmp_path):
    client = FakeSupabase(rows=[
        {"term": "togel", "category": "lottery", "weight": 0.9, "active": True,
         "language": "id", "variations": ["t0gel"], "aliases": None},
        # NULLs in optional columns must not break parsing
        {"term": "judi", "category": None, "weight": None, "active": True,
         "language": None, "variations": None, "aliases": None},
    ])
    provider = make_provider(tmp_path, client, local=LOCAL)

    keywords = {k.term: k for k in provider.get_keywords()}

    assert client.calls == ["keywords"]
    assert set(keywords) == {"togel", "judi"}
    assert keywords["togel"].variations == ["t0gel"] and keywords["togel"].aliases == []
    assert keywords["judi"].category == "general"
    assert keywords["judi"].weight == 0.5
    assert keywords["judi"].language == "id"


@pytest.mark.parametrize("client", [
    FakeSupabase(rows=[]),                                  # table not seeded yet
    FakeSupabase(error=RuntimeError("network down")),       # outage
])
def test_falls_back_to_local_file(tmp_path, client):
    provider = make_provider(tmp_path, client, local=LOCAL)
    assert [k.term for k in provider.get_keywords()] == ["lokal"]


def test_falls_back_to_seed_when_nothing_else_exists(tmp_path):
    provider = make_provider(tmp_path, FakeSupabase(rows=[]))
    terms = {k.term for k in provider.get_keywords()}
    assert {"judi", "togel", "slot"} <= terms


def test_seed_weights_match_the_keyword_file():
    """Seed adalah cadangan terakhir; bobotnya harus sama dengan data/keywords.json.

    Dulu seed memberi "bola" 0.5 (sama dengan ambang jangkar DET-04) padahal
    file memberi 0.3, sehingga saat file hilang halaman sepak bola ikut ditandai.
    """
    from pathlib import Path
    path = Path(__file__).resolve().parents[1] / "data" / "keywords.json"
    weights = {item["term"]: item["weight"] for item in json.loads(path.read_text(encoding="utf-8"))}
    different = {k["term"]: (k["weight"], weights[k["term"]])
                 for k in KeywordProvider.SEED_KEYWORDS
                 if k["term"] in weights and k["weight"] != weights[k["term"]]}
    assert not different, f"(seed, file): {different}"


def test_seed_fallback_never_overwrites_the_local_file(tmp_path):
    path = tmp_path / "keywords.json"
    path.write_text("rusak, bukan json", encoding="utf-8")
    provider = KeywordProvider(local_fallback_path=str(path))
    provider._supabase_client = FakeSupabase(rows=[])

    assert {"judi", "togel"} <= {k.term for k in provider.get_keywords()}
    assert path.read_text(encoding="utf-8") == "rusak, bukan json"


def test_reading_the_local_file_does_not_rewrite_it(tmp_path):
    provider = make_provider(tmp_path, FakeSupabase(rows=[]), local=LOCAL)
    before = (tmp_path / "keywords.json").read_bytes()
    provider.get_keywords()
    assert (tmp_path / "keywords.json").read_bytes() == before


def test_supabase_keywords_are_saved_for_offline_use(tmp_path):
    client = FakeSupabase(rows=[{"term": "togel", "category": "lottery", "weight": 0.9,
                                 "active": True, "language": "id"}])
    provider = make_provider(tmp_path, client, local=LOCAL)
    provider.get_keywords()
    saved = json.loads((tmp_path / "keywords.json").read_text(encoding="utf-8"))
    assert [k["term"] for k in saved] == ["togel"]


def test_cache_avoids_repeat_queries_until_ttl(tmp_path):
    client = FakeSupabase(rows=[{"term": "judi", "category": "g", "weight": 0.9,
                                 "active": True, "language": "id"}])
    provider = make_provider(tmp_path, client)

    provider.get_keywords()
    provider.get_keywords()
    assert client.calls == ["keywords"], "second call should be served from cache"

    provider.get_keywords(force_refresh=True)
    assert client.calls == ["keywords", "keywords"]


def test_expired_cache_refetches(tmp_path):
    client = FakeSupabase(rows=[{"term": "judi", "category": "g", "weight": 0.9,
                                 "active": True, "language": "id"}])
    provider = make_provider(tmp_path, client, ttl=0)  # always expired

    provider.get_keywords()
    provider.get_keywords()
    assert len(client.calls) == 2
