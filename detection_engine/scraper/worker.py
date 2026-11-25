r"""Worker scraping: ambil job dari scrape_jobs, buka halaman, jalankan DET-01..05, simpan hasil.

Alur satu job (docs/RANCANGAN_SCRAPER.md §6):

    PENDING --claim--> IN_PROGRESS --> SUCCESS  (+ baris scrape_results berisi skor & bukti)
                                   \-> BLOCKED  (halaman blokir TrustPositif; bukti disimpan)
                                   \-> FAILED   (TIMEOUT/CONNECTION/HTTP_5XX dicoba ulang
                                                 maks. 3 kali dengan jeda, lainnya langsung gagal)

Menjalankan (dari root repo):

    # uji satu URL tanpa database, cetak hasil deteksi sebagai JSON
    python -m detection_engine.scraper.worker --url https://contoh.com

    # worker antrean (butuh SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di server)
    python -m detection_engine.scraper.worker            # terus berjalan
    python -m detection_engine.scraper.worker --once     # proses satu job lalu berhenti

Kunci service_role hanya boleh ada di server worker, jangan pernah di .env Next.js
yang berawalan NEXT_PUBLIC_ dan jangan di-commit.
"""

import argparse
import base64
import json
import logging
import os
import socket
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol

from detection_engine.scraper.fetcher import FetchConfig, PageCapture, PageFetcher, ScrapeOutcome
from detection_engine.scraper.variants import RETRY_PROFILES, is_cloaking, should_retry

logger = logging.getLogger("gamblewatch.scraper")

MAX_ATTEMPTS = 3
RETRY_DELAYS_SECONDS = (60, 300)          # jeda sebelum percobaan ke-2 dan ke-3
RETRYABLE_CODES = {"TIMEOUT", "CONNECTION", "HTTP_5XX", "ERROR"}
DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "scraper"


@dataclass
class ScrapeJob:
    id: int
    url: str
    attempts: int = 1
    laporan_id: Optional[int] = None

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "ScrapeJob":
        return cls(id=int(row["id"]), url=str(row["url"]),
                   attempts=int(row.get("attempts") or 1), laporan_id=row.get("laporan_id"))


class JobStore(Protocol):
    def claim(self, worker_id: str) -> Optional[ScrapeJob]: ...
    def update_job(self, job_id: int, fields: Dict[str, Any]) -> None: ...
    def save_result(self, row: Dict[str, Any]) -> None: ...


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --- Supabase ---------------------------------------------------------------------

def key_role(key: str) -> Optional[str]:
    """Peran yang tertulis di kunci Supabase ('service_role', 'anon', ...), tanpa verifikasi."""
    if key.startswith("sb_secret_"):
        return "service_role"
    if key.startswith("sb_publishable_"):
        return "anon"
    parts = key.split(".")
    if len(parts) != 3:
        return None
    try:
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        return json.loads(base64.urlsafe_b64decode(payload)).get("role")
    except (ValueError, json.JSONDecodeError):
        return None


class SupabaseJobStore:
    """Antrean di tabel Supabase. Butuh kunci service_role karena RLS menutup tabel ini."""

    def __init__(self, url: str, service_key: str, stale_minutes: int = 10):
        if key_role(service_key) != "service_role":
            raise ValueError(
                "SUPABASE_SERVICE_ROLE_KEY bukan kunci service_role. Kunci anon tidak bisa "
                "menulis ke scrape_jobs/scrape_results karena tabel dilindungi RLS.")
        from supabase import create_client
        self.client = create_client(url, service_key)
        self.stale_minutes = stale_minutes

    @classmethod
    def from_env(cls) -> "SupabaseJobStore":
        from detection_engine.config.env import load_env_files
        load_env_files()
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit("Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment "
                             "server worker (lihat docs/RANCANGAN_SCRAPER.md §10).")
        return cls(url, key)

    def claim(self, worker_id: str) -> Optional[ScrapeJob]:
        rows = self.client.rpc("claim_scrape_job", {
            "p_worker": worker_id, "p_stale_minutes": self.stale_minutes,
            "p_max_attempts": MAX_ATTEMPTS,
        }).execute().data
        if not isinstance(rows, list) or not rows or not isinstance(rows[0], dict):
            return None
        return ScrapeJob.from_row(dict(rows[0]))

    def update_job(self, job_id: int, fields: Dict[str, Any]) -> None:
        self.client.table("scrape_jobs").update(fields).eq("id", job_id).execute()

    def save_result(self, row: Dict[str, Any]) -> None:
        self.client.table("scrape_results").insert(row).execute()


# --- Deteksi ----------------------------------------------------------------------

def run_detection(pipeline, capture: PageCapture) -> Dict[str, Any]:
    """Jalankan pipeline DET-01..05 atas hasil scraping. Mengembalikan get_summary()."""
    from pydantic import ValidationError
    from detection_engine.models.detection_models import DetectionInput

    scraped = {
        "page_text": capture.text, "title": capture.title,
        "meta": {"description": capture.meta_description},
        "links": capture.outbound_links, "media_urls": [],
    }
    detection_input = None
    # URL akhir (setelah redirect) dinilai DET-01; bila formatnya ditolak, pakai URL awal
    for url in (capture.final_url, capture.requested_url, None):
        try:
            detection_input = DetectionInput.model_validate(
                {"url": url, "screenshot": capture.screenshot,
                 "ocr_screenshot": capture.ocr_screenshot, "scraped": scraped})
            break
        except ValidationError:
            continue
    return pipeline.get_summary(pipeline.run_all(detection_input))


# --- Worker -----------------------------------------------------------------------

class ScrapeWorker:
    def __init__(self, store: Optional[JobStore], fetcher: PageFetcher, pipeline,
                 data_dir: Path = DEFAULT_DATA_DIR, worker_id: Optional[str] = None):
        self.store = store
        self.fetcher = fetcher
        self.pipeline = pipeline
        self.screenshot_dir = Path(data_dir) / "screenshots"
        self.worker_id = worker_id or f"{socket.gethostname()}-{uuid.uuid4().hex[:6]}"

    def _job_store(self) -> JobStore:
        if self.store is None:
            raise RuntimeError("Worker dibuat tanpa JobStore (mode --url tidak memakai antrean)")
        return self.store

    def _assess(self, url: str, profile: str):
        outcome = self.fetcher.fetch(url, profile=profile)
        summary = None
        if outcome.ok and outcome.capture is not None:
            summary = run_detection(self.pipeline, outcome.capture)
        return outcome, summary

    def scrape_and_detect(self, url: str):
        """Scrape dan nilai satu URL dengan aturan yang sama seperti POST /scan.

        -> (outcome, summary|None). summary["profile"] = tampilan yang dipakai,
        summary["cloaking"] = True bila hanya versi "dari Google" yang berisi judi.
        """
        outcome, summary = self._assess(url, "desktop")
        best_outcome, best_summary, best_profile = outcome, summary, "desktop"
        search_score = None
        if summary is not None and should_retry(outcome.ok, summary):
            for profile in RETRY_PROFILES:
                alt_outcome, alt_summary = self._assess(url, profile)
                if alt_summary is None:
                    continue
                if profile == "search":
                    search_score = alt_summary["overall_score"]
                if alt_summary["overall_score"] > best_summary["overall_score"]:
                    best_outcome, best_summary, best_profile = alt_outcome, alt_summary, profile
        if summary is not None and best_summary is not None:
            best_summary["profile"] = best_profile
            best_summary["cloaking"] = is_cloaking(
                summary["overall_score"], search_score, best_summary.get("overall_risk", "low"))
        return best_outcome, best_summary

    def _save_screenshot(self, job_id: int, capture: PageCapture) -> Optional[str]:
        if not capture.screenshot:
            return None
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)
        ext = "png" if capture.screenshot[:4] == b"\x89PNG" else "jpg"
        path = self.screenshot_dir / f"job_{job_id}.{ext}"
        path.write_bytes(capture.screenshot)
        return str(path)

    def result_row(self, job_id: int, outcome: ScrapeOutcome,
                   summary: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        capture = outcome.capture
        if capture is None:
            raise ValueError("result_row butuh hasil scraping (capture)")
        return {
            "job_id": job_id,
            "final_url": capture.final_url,
            "http_status": capture.http_status,
            "redirect_chain": capture.redirect_chain,
            "title": capture.title,
            "meta_description": capture.meta_description,
            "page_text": capture.text,
            "screenshot_path": self._save_screenshot(job_id, capture),
            "outbound_links": capture.outbound_links,
            "load_ms": capture.load_ms,
            "user_agent": capture.user_agent,
            "overall_score": summary["overall_score"] if summary else None,
            "indication": summary["indication"] if summary else None,
            "modules": summary["modules"] if summary else None,
            "profile": (summary or {}).get("profile", capture.profile),
            "cloaking": bool((summary or {}).get("cloaking", False)),
        }

    def process(self, job: ScrapeJob) -> Dict[str, Any]:
        """Proses satu job yang sudah di-claim. Mengembalikan ringkasan untuk log."""
        logger.info("Job %s (percobaan %s): %s", job.id, job.attempts, job.url)
        outcome, summary = self.scrape_and_detect(job.url)

        if outcome.capture is not None and outcome.status in ("SUCCESS", "BLOCKED"):
            self._job_store().save_result(self.result_row(job.id, outcome, summary))

        fields: Dict[str, Any] = {
            "status": outcome.status,
            "failure_code": outcome.failure_code,
            "failure_message": outcome.failure_message,
            "finished_at": _now().isoformat(),
        }
        retry = (outcome.status == "FAILED" and outcome.failure_code in RETRYABLE_CODES
                 and job.attempts < MAX_ATTEMPTS)
        if retry:
            delay = RETRY_DELAYS_SECONDS[min(job.attempts, len(RETRY_DELAYS_SECONDS)) - 1]
            fields.update(status="PENDING", finished_at=None, worker_id=None, started_at=None,
                          next_attempt_at=(_now() + timedelta(seconds=delay)).isoformat())
        self._job_store().update_job(job.id, fields)

        record = {"job_id": job.id, "url": job.url, "status": fields["status"],
                  "failure_code": outcome.failure_code}
        if summary:
            record.update(indication=summary["indication"],
                          score=round(summary["overall_score"], 3))
        logger.info("Job %s selesai: %s", job.id, record)
        return record

    def run_once(self) -> Optional[Dict[str, Any]]:
        job = self._job_store().claim(self.worker_id)
        return self.process(job) if job else None

    def run_forever(self, poll_seconds: float = 5.0, max_jobs: Optional[int] = None) -> None:
        done = 0
        while max_jobs is None or done < max_jobs:
            try:
                record = self.run_once()
            except Exception:
                logger.exception("Kesalahan worker; job akan dikembalikan ke antrean bila macet")
                time.sleep(poll_seconds * 6)
                continue
            if record is None:
                time.sleep(poll_seconds)
            else:
                done += 1


# --- CLI --------------------------------------------------------------------------

def _summary_for_print(outcome: ScrapeOutcome, summary: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    capture = outcome.capture
    out: Dict[str, Any] = {"status": outcome.status, "failure_code": outcome.failure_code,
                           "failure_message": outcome.failure_message}
    if capture:
        out.update(final_url=capture.final_url, http_status=capture.http_status,
                   redirect_chain=capture.redirect_chain, title=capture.title,
                   text_chars=len(capture.text), links=len(capture.outbound_links),
                   screenshot_bytes=len(capture.screenshot or b""), load_ms=capture.load_ms)
    if summary:
        out.update(indication=summary["indication"], overall_score=summary["overall_score"],
                   modules={k: {"score": v["score"], "label": v["label"],
                                "findings": v.get("findings", [])[:8]}
                            for k, v in summary["modules"].items()})
    return out


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Worker scraping GambleWatch")
    parser.add_argument("--url", help="scrape satu URL tanpa database lalu cetak hasilnya")
    parser.add_argument("--once", action="store_true", help="proses satu job antrean lalu berhenti")
    parser.add_argument("--poll", type=float, default=5.0, help="jeda cek antrean (detik)")
    parser.add_argument("--headed", action="store_true", help="tampilkan jendela browser")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    from detection_engine.pipeline import DetectionPipeline
    pipeline = DetectionPipeline()

    with PageFetcher(FetchConfig(headless=not args.headed)) as fetcher:
        if args.url:
            worker = ScrapeWorker(None, fetcher, pipeline)
            outcome, summary = worker.scrape_and_detect(args.url)
            print(json.dumps(_summary_for_print(outcome, summary), ensure_ascii=False, indent=2))
            return 0 if outcome.ok else 1

        worker = ScrapeWorker(SupabaseJobStore.from_env(), fetcher, pipeline)
        logger.info("Worker %s mulai", worker.worker_id)
        if args.once:
            record = worker.run_once()
            print(json.dumps(record or {"pesan": "antrean kosong"}, ensure_ascii=False))
        else:
            worker.run_forever(poll_seconds=args.poll)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
