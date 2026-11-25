"""Tes worker antrean scraping (detection_engine/scraper/worker.py).

DITAHAN: worker, tabel scrape_jobs/scrape_results, dan monitoring belum dipakai aplikasi.
File ini menyertai worker.py; commit keduanya bersamaan saat pekerjaan scraper dilanjutkan.
"""

import base64
import json
from typing import Any, Dict, List

from detection_engine.scraper.fetcher import PageCapture, ScrapeOutcome
from detection_engine.scraper.worker import MAX_ATTEMPTS, ScrapeJob, ScrapeWorker, key_role
from tests.test_scraper import browser_fetcher, local_site  # noqa: F401  (fixture)

# --- key_role ------------------------------------------------------------------------

def _jwt(payload: Dict[str, Any]) -> str:
    def b64(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode().rstrip("=")
    return f"{b64(b'{}')}.{b64(json.dumps(payload).encode())}.tandatangan"


def test_key_role():
    assert key_role(_jwt({"role": "service_role"})) == "service_role"
    assert key_role(_jwt({"role": "anon"})) == "anon"
    assert key_role("sb_secret_contoh") == "service_role"
    assert key_role("sb_publishable_contoh") == "anon"
    assert key_role("bukan-kunci") is None


# --- worker dengan fetcher dan pipeline palsu -------------------------------------------

class MemoryJobStore:
    def __init__(self, jobs: List[ScrapeJob]):
        self.jobs = list(jobs)
        self.updates: Dict[int, Dict[str, Any]] = {}
        self.results: List[Dict[str, Any]] = []

    def claim(self, worker_id):
        return self.jobs.pop(0) if self.jobs else None

    def update_job(self, job_id, fields):
        self.updates[job_id] = fields

    def save_result(self, row):
        self.results.append(row)


def _capture(text="slot gacor maxwin", screenshot=b"\x89PNG\r\n\x1a\nxx") -> PageCapture:
    return PageCapture(
        requested_url="https://slot88.xyz/", final_url="https://slot88.xyz/", http_status=200,
        redirect_chain=[], title="Slot", meta_description="", text=text,
        screenshot=screenshot, outbound_links=["https://link-alternatif.xyz/"],
        load_ms=1200, user_agent="UA")


class FakeFetcher:
    def __init__(self, outcome: ScrapeOutcome):
        self.outcome = outcome
        self.urls: List[str] = []

    def fetch(self, url, profile="desktop"):
        self.urls.append(url)
        return self.outcome


class FakePipeline:
    def __init__(self):
        self.inputs = []

    def run_all(self, detection_input):
        self.inputs.append(detection_input)
        return detection_input

    def get_summary(self, _):
        return {"overall_score": 0.82, "indication": "Tinggi",
                "modules": {"keyword_analysis": {"score": 0.8, "label": "Terdeteksi",
                                                 "findings": ["slot gacor"]}}}


def _worker(outcome, jobs, tmp_path):
    store = MemoryJobStore(jobs)
    pipeline = FakePipeline()
    worker = ScrapeWorker(store, FakeFetcher(outcome), pipeline, data_dir=tmp_path, worker_id="uji")
    return worker, store, pipeline


def test_success_saves_result_and_screenshot(tmp_path):
    worker, store, pipeline = _worker(ScrapeOutcome("SUCCESS", capture=_capture()),
                                      [ScrapeJob(id=7, url="https://slot88.xyz/")], tmp_path)
    record = worker.run_once()

    assert record["status"] == "SUCCESS" and record["indication"] == "Tinggi"
    assert store.updates[7]["status"] == "SUCCESS"
    row = store.results[0]
    assert row["job_id"] == 7 and row["indication"] == "Tinggi" and row["overall_score"] == 0.82
    assert row["outbound_links"] == ["https://link-alternatif.xyz/"]
    assert (tmp_path / "screenshots" / "job_7.png").read_bytes().startswith(b"\x89PNG")
    # teks hasil scraping benar-benar diteruskan ke pipeline
    assert pipeline.inputs[0].scraped["page_text"] == "slot gacor maxwin"
    assert str(pipeline.inputs[0].url) == "https://slot88.xyz/"


def test_blocked_page_keeps_evidence_without_detection(tmp_path):
    outcome = ScrapeOutcome("BLOCKED", "BLOCKED", "diblokir", capture=_capture("Internet Positif"))
    worker, store, pipeline = _worker(outcome, [ScrapeJob(id=8, url="https://slot88.xyz/")],
                                      tmp_path)
    worker.run_once()
    assert store.updates[8]["status"] == "BLOCKED"
    assert store.results[0]["indication"] is None
    assert pipeline.inputs == []


def test_timeout_is_retried_with_delay(tmp_path):
    outcome = ScrapeOutcome("FAILED", "TIMEOUT", "Timeout 30000ms exceeded.")
    worker, store, _ = _worker(outcome, [ScrapeJob(id=9, url="https://a.test/", attempts=1)],
                               tmp_path)
    worker.run_once()
    fields = store.updates[9]
    assert fields["status"] == "PENDING" and fields["next_attempt_at"]
    assert store.results == []


def test_timeout_after_last_attempt_fails(tmp_path):
    outcome = ScrapeOutcome("FAILED", "TIMEOUT", "Timeout")
    worker, store, _ = _worker(
        outcome, [ScrapeJob(id=10, url="https://a.test/", attempts=MAX_ATTEMPTS)], tmp_path)
    worker.run_once()
    assert store.updates[10]["status"] == "FAILED"
    assert store.updates[10]["failure_code"] == "TIMEOUT"


def test_unsafe_target_is_not_retried(tmp_path):
    outcome = ScrapeOutcome("FAILED", "UNSAFE_TARGET", "10.0.0.1")
    worker, store, _ = _worker(outcome, [ScrapeJob(id=11, url="http://10.0.0.1/")], tmp_path)
    worker.run_once()
    assert store.updates[11]["status"] == "FAILED"


def test_empty_queue(tmp_path):
    worker, _, _ = _worker(ScrapeOutcome("SUCCESS"), [], tmp_path)
    assert worker.run_once() is None


def test_scraped_page_runs_through_real_pipeline(local_site, browser_fetcher, tmp_path):
    from detection_engine.pipeline import DetectionPipeline

    store = MemoryJobStore([ScrapeJob(id=1, url=f"{local_site}/index.html")])
    worker = ScrapeWorker(store, browser_fetcher, DetectionPipeline(), data_dir=tmp_path)
    worker.run_once()

    row = store.results[0]
    assert store.updates[1]["status"] == "SUCCESS"
    assert row["modules"]["keyword_analysis"]["score"] > 0
    assert row["indication"] in ("Sedang", "Tinggi")


# --- Profil ulang (search/mobile) dan cloaking: aturan sama dengan POST /scan ---------

class ProfileFetcher:
    def __init__(self):
        self.profiles: List[str] = []

    def fetch(self, url, profile="desktop"):
        self.profiles.append(profile)
        return ScrapeOutcome("SUCCESS", capture=_capture())


class SequencePipeline:
    def __init__(self, summaries):
        self.summaries = list(summaries)

    def run_all(self, detection_input):
        return detection_input

    def get_summary(self, _):
        return self.summaries.pop(0)


def _summary(score, risk, findings=()):
    return {"overall_score": score, "overall_risk": risk, "indication": "x",
            "modules": {"keyword_analysis": {"score": score, "findings": list(findings)}}}


def test_clean_page_is_retried_as_search_visitor_and_flags_cloaking(tmp_path):
    fetcher = ProfileFetcher()
    pipeline = SequencePipeline([_summary(0.1, "low"), _summary(0.8, "high", ["slot gacor"]),
                                 _summary(0.1, "low")])
    worker = ScrapeWorker(None, fetcher, pipeline, data_dir=tmp_path, worker_id="uji")
    outcome, summary = worker.scrape_and_detect("https://kampus.ac.id/")
    assert fetcher.profiles == ["desktop", "search", "mobile"]
    assert summary["profile"] == "search" and summary["cloaking"] is True
    row = worker.result_row(1, outcome, summary)
    assert row["profile"] == "search" and row["cloaking"] is True


def test_page_that_mentions_gambling_is_not_retried(tmp_path):
    fetcher = ProfileFetcher()
    pipeline = SequencePipeline([_summary(0.2, "low", ["judi"])])
    worker = ScrapeWorker(None, fetcher, pipeline, data_dir=tmp_path, worker_id="uji")
    _, summary = worker.scrape_and_detect("https://berita.example/judi")
    assert fetcher.profiles == ["desktop"]
    assert summary["profile"] == "desktop" and summary["cloaking"] is False
