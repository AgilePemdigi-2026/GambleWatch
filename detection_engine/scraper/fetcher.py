"""Membuka satu halaman dengan Playwright (Chromium headless) dan mengambil buktinya.

Pengaturan mengikuti docs/RANCANGAN_SCRAPER.md §5.1:
    * konteks browser baru per halaman (tanpa cookie/login sisa halaman sebelumnya)
    * unduhan ditolak, popup/tab baru ditutup, video/audio tidak dimuat
    * SETIAP request (termasuk redirect, gambar, skrip) diperiksa: host yang mengarah ke
      alamat non-publik dibatalkan (pencegahan SSRF, lihat safety.py)
    * teks dipotong 200.000 karakter (sama dengan batas API /analyze), screenshot ≤ 5 MB

Keterbatasan yang diketahui: pemeriksaan alamat dan koneksi Chromium me-resolve DNS
secara terpisah, sehingga serangan DNS rebinding yang sangat cepat secara teori masih bisa
lolos. Jalankan worker di container/jaringan yang tidak bisa menjangkau layanan internal.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

from detection_engine.scraper.classify import classify_error, classify_page
from detection_engine.scraper.safety import (
    DnsFailure, Resolver, UnsafeTarget, check_host, check_url,
)

logger = logging.getLogger(__name__)

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024

LINKS_JS = """() => Array.from(document.querySelectorAll('a[href]'), a => a.href)"""
META_JS = """() => (document.querySelector('meta[name="description" i]') || {}).content || ''"""


@dataclass
class FetchConfig:
    nav_timeout_ms: int = 30_000
    settle_ms: int = 3_000            # tunggu jaringan tenang setelah DOM siap
    viewport: Dict[str, int] = field(default_factory=lambda: {"width": 1366, "height": 900})
    user_agent: str = DEFAULT_USER_AGENT
    max_text_chars: int = 200_000
    max_links: int = 300
    headless: bool = True
    allow_private: bool = False       # HANYA untuk tes dengan server lokal
    resolver: Optional[Resolver] = None


@dataclass
class PageCapture:
    requested_url: str
    final_url: str
    http_status: Optional[int]
    redirect_chain: List[str]
    title: str
    meta_description: str
    text: str
    screenshot: Optional[bytes]
    outbound_links: List[str]
    load_ms: int
    user_agent: str


@dataclass
class ScrapeOutcome:
    status: str                       # SUCCESS / FAILED / BLOCKED
    failure_code: Optional[str] = None
    failure_message: Optional[str] = None
    capture: Optional[PageCapture] = None

    @property
    def ok(self) -> bool:
        return self.status == "SUCCESS"


def _failed(code: str, message: str, capture: Optional[PageCapture] = None) -> ScrapeOutcome:
    status = "BLOCKED" if code == "BLOCKED" else "FAILED"
    return ScrapeOutcome(status=status, failure_code=code,
                         failure_message=message[:500], capture=capture)


class PageFetcher:
    """Satu browser Chromium yang dipakai ulang; setiap fetch() memakai konteks baru.

        with PageFetcher() as fetcher:
            outcome = fetcher.fetch("https://contoh.com")
    """

    def __init__(self, config: Optional[FetchConfig] = None):
        self.config = config or FetchConfig()
        self._playwright: Optional[Any] = None
        self._browser: Optional[Any] = None
        self._host_cache: Dict[str, bool] = {}

    def __enter__(self) -> "PageFetcher":
        self.start()
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def start(self) -> None:
        if self._browser:
            return
        from playwright.sync_api import sync_playwright
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=self.config.headless)

    def close(self) -> None:
        if self._browser:
            self._browser.close()
            self._browser = None
        if self._playwright:
            self._playwright.stop()
            self._playwright = None

    # --- pemeriksaan setiap request di dalam browser ---

    def _host_allowed(self, host: str) -> bool:
        if host not in self._host_cache:
            try:
                check_host(host, resolver=self.config.resolver,
                           allow_private=self.config.allow_private)
                self._host_cache[host] = True
            except UnsafeTarget:
                self._host_cache[host] = False
            except DnsFailure:
                return True   # biarkan Chromium sendiri yang gagal me-resolve
        return self._host_cache[host]

    def _guard(self, route) -> None:
        request = route.request
        parts = urlsplit(request.url)
        if parts.scheme in ("http", "https") and not self._host_allowed(parts.hostname or ""):
            logger.warning("Request diblokir (alamat non-publik): %s", request.url[:200])
            route.abort("blockedbyclient")
            return
        if request.resource_type == "media":
            route.abort()
            return
        route.continue_()

    # --- utama ---

    def fetch(self, url: str) -> ScrapeOutcome:
        try:
            clean_url, _ = check_url(url, resolver=self.config.resolver,
                                     allow_private=self.config.allow_private)
        except UnsafeTarget as exc:
            return _failed("UNSAFE_TARGET", str(exc))
        except DnsFailure as exc:
            return _failed("DNS", str(exc))

        self.start()
        assert self._browser is not None
        cfg = self.config
        context = self._browser.new_context(
            viewport=cfg.viewport, user_agent=cfg.user_agent, locale="id-ID",
            timezone_id="Asia/Jakarta", accept_downloads=False, service_workers="block",
        )
        try:
            context.route("**/*", self._guard)
            page = context.new_page()
            page.on("popup", lambda popup: popup.close())
            page.set_default_timeout(cfg.nav_timeout_ms)

            started = time.monotonic()
            try:
                response = page.goto(clean_url, wait_until="domcontentloaded",
                                     timeout=cfg.nav_timeout_ms)
            except Exception as exc:  # playwright Error / TimeoutError
                return _failed(classify_error(str(exc)), str(exc))
            try:
                page.wait_for_load_state("networkidle", timeout=cfg.settle_ms)
            except Exception:
                pass  # situs dengan iklan/polling tidak pernah benar-benar tenang
            load_ms = int((time.monotonic() - started) * 1000)

            capture = self._capture(page, clean_url, response, load_ms)
            code = classify_page(capture.final_url, capture.http_status,
                                 capture.title, capture.text)
            if code:
                return _failed(code, f"{code} di {capture.final_url}", capture)
            return ScrapeOutcome(status="SUCCESS", capture=capture)
        except Exception as exc:
            logger.exception("Scrape gagal untuk %s", clean_url)
            return _failed(classify_error(str(exc)), str(exc))
        finally:
            context.close()

    def _capture(self, page, requested_url: str, response, load_ms: int) -> PageCapture:
        cfg = self.config
        chain: List[str] = []
        if response is not None:
            request = response.request.redirected_from
            while request is not None:
                chain.insert(0, request.url)
                request = request.redirected_from

        def safe(fn, default):
            try:
                return fn()
            except Exception:
                return default

        text = safe(lambda: page.inner_text("body", timeout=5_000), "")
        links = safe(lambda: page.evaluate(LINKS_JS), []) or []
        seen, outbound = set(), []
        for href in links:
            if isinstance(href, str) and href.startswith(("http://", "https://")) and href not in seen:
                seen.add(href)
                outbound.append(href[:2048])
                if len(outbound) >= cfg.max_links:
                    break

        return PageCapture(
            requested_url=requested_url,
            final_url=page.url,
            http_status=response.status if response is not None else None,
            redirect_chain=chain,
            title=safe(page.title, "")[:500],
            meta_description=str(safe(lambda: page.evaluate(META_JS), ""))[:1000],
            text=text[:cfg.max_text_chars],
            screenshot=self._screenshot(page),
            outbound_links=outbound,
            load_ms=load_ms,
            user_agent=cfg.user_agent,
        )

    @staticmethod
    def _screenshot(page) -> Optional[bytes]:
        """Screenshot layar pertama; diturunkan ke JPEG bila PNG melebihi 5 MB."""
        try:
            image = page.screenshot(type="png", timeout=15_000)
            if len(image) > MAX_SCREENSHOT_BYTES:
                image = page.screenshot(type="jpeg", quality=60, timeout=15_000)
            return image if len(image) <= MAX_SCREENSHOT_BYTES else None
        except Exception:
            return None
