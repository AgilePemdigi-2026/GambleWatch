"""Membuka satu halaman dengan Playwright (Chromium headless) dan mengambil buktinya.

Pengaturan mengikuti docs/RANCANGAN_SCRAPER.md §5.1:
    * konteks browser baru per halaman (tanpa cookie/login sisa halaman sebelumnya)
    * unduhan ditolak, popup/tab baru ditutup, video/audio tidak dimuat
    * SETIAP request (termasuk redirect, gambar, skrip) diperiksa: host yang mengarah ke
      alamat non-publik dibatalkan (pencegahan SSRF, lihat safety.py)
    * teks dipotong 200.000 karakter (sama dengan batas API /analyze), screenshot ≤ 5 MB

    * domain yang diblokir DNS provider (Internet Positif) dibuka lewat DNS publik (DoH),
      seperti browser pengguna yang memakai Secure DNS; matikan dengan GAMBLEWATCH_PUBLIC_DNS=0

Keterbatasan yang diketahui: pemeriksaan alamat dan koneksi Chromium me-resolve DNS
secara terpisah, sehingga serangan DNS rebinding yang sangat cepat secara teori masih bisa
lolos. Jalankan worker di container/jaringan yang tidak bisa menjangkau layanan internal.
"""

import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

from detection_engine.scraper.classify import classify_error, classify_page
from detection_engine.scraper.safety import (
    DnsDetour, DnsFailure, Resolver, UnsafeTarget, check_host, check_url, doh_resolver,
    find_dns_detour, is_public_address, normalize_url,
)

logger = logging.getLogger(__name__)

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
MAX_FRAMES = 20

MOBILE_USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
)
SEARCH_USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

# Cara membuka halaman:
#   desktop  pengunjung biasa di komputer
#   mobile   pengunjung di HP (banyak situs judi menampilkan isi berbeda di HP)
#   search   seolah dari mesin pencari: situs yang diretas sering hanya menampilkan spam judi
#            ke Googlebot / pengunjung dari Google (cloaking), sementara pengunjung biasa
#            melihat halaman normal
PROFILES: Dict[str, Dict[str, Any]] = {
    "desktop": {},
    "mobile": {"viewport": {"width": 390, "height": 844}, "user_agent": MOBILE_USER_AGENT,
               "is_mobile": True, "has_touch": True},
    "search": {"user_agent": SEARCH_USER_AGENT,
               "extra_http_headers": {"Referer": "https://www.google.com/"}},
}

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
    max_scroll_screens: int = 3       # scroll & screenshot OCR sampai 3 tinggi layar
    headless: bool = True
    allow_private: bool = False       # HANYA untuk tes dengan server lokal
    resolver: Optional[Resolver] = None
    # Lewati blokir DNS provider dengan DNS publik (DoH). Tidak dipakai bila resolver
    # diganti (tes) atau allow_private aktif.
    public_dns: bool = field(
        default_factory=lambda: os.getenv("GAMBLEWATCH_PUBLIC_DNS", "1").strip() != "0")


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
    ocr_screenshot: Optional[bytes] = None   # sampai 3 layar (JPEG), hanya bila halaman lebih panjang
    profile: str = "desktop"


@dataclass
class ScrapeOutcome:
    status: str                       # SUCCESS / FAILED / BLOCKED
    failure_code: Optional[str] = None
    failure_message: Optional[str] = None
    capture: Optional[PageCapture] = None
    isp_blocked: bool = False         # domain diblokir DNS provider, dibuka lewat DNS publik

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
        try:
            self._browser = self._playwright.chromium.launch(headless=self.config.headless)
        except Exception:
            # Hentikan Playwright yang sudah jalan; kalau dibiarkan, start() berikutnya di
            # thread yang sama gagal dengan "Sync API inside the asyncio loop".
            self.close()
            raise

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

    def _guard(self, route, mapped: Optional[Dict[str, List[str]]] = None) -> None:
        request = route.request
        parts = urlsplit(request.url)
        host = (parts.hostname or "").lower()
        # Host yang diarahkan ke alamat DNS publik sudah diperiksa saat rencana fetch dibuat
        allowed = host in mapped if mapped and host in mapped else self._host_allowed(host)
        if parts.scheme in ("http", "https") and not allowed:
            logger.warning("Request diblokir (alamat non-publik): %s", request.url[:200])
            route.abort("blockedbyclient")
            return
        if request.resource_type == "media":
            route.abort()
            return
        route.continue_()

    # --- utama ---

    def _dns_detour(self, host: str) -> Optional[DnsDetour]:
        cfg = self.config
        if not cfg.public_dns or cfg.resolver is not None or cfg.allow_private:
            return None
        try:
            return find_dns_detour(host)
        except Exception:   # DNS publik hanya cadangan; jangan gagalkan scraping karenanya
            logger.warning("Pemeriksaan DNS publik gagal untuk %s", host, exc_info=True)
            return None

    def _mapped_hosts(self, host: str, detour: DnsDetour) -> Dict[str, List[str]]:
        """host -> alamat DNS publik, termasuk varian www/tanpa-www (redirect paling umum)."""
        mapped = {host: detour.addresses}
        variant = host[4:] if host.startswith("www.") else f"www.{host}"
        try:
            addresses = doh_resolver(variant)
        except DnsFailure:
            addresses = []
        if addresses and all(is_public_address(a) for a in addresses):
            mapped[variant] = addresses
        return mapped

    def fetch(self, url: str, profile: str = "desktop") -> ScrapeOutcome:
        system_failure: Optional[DnsFailure] = None
        try:
            clean_url, _ = check_url(url, resolver=self.config.resolver,
                                     allow_private=self.config.allow_private)
        except UnsafeTarget as exc:
            return _failed("UNSAFE_TARGET", str(exc))
        except DnsFailure as exc:
            clean_url, system_failure = normalize_url(url), exc

        host = (urlsplit(clean_url).hostname or "").lower()
        detour = self._dns_detour(host)
        if detour is None:
            if system_failure is not None:
                return _failed("DNS", str(system_failure))
            self.start()
            assert self._browser is not None
            return self._open(self._browser, clean_url, profile, None)

        # Domain diblokir/dialihkan DNS provider: buka lewat alamat dari DNS publik
        try:
            check_host(host, resolver=lambda _host: detour.addresses)
        except UnsafeTarget as exc:
            return _failed("UNSAFE_TARGET", str(exc))
        mapped = self._mapped_hosts(host, detour)
        rules = ", ".join(f"MAP {name} {addresses[0]}" for name, addresses in mapped.items())
        logger.info("DNS sistem berbeda dengan DNS publik untuk %s; dibuka lewat %s",
                    host, detour.addresses[0])
        self.start()
        assert self._playwright is not None
        browser = self._playwright.chromium.launch(
            headless=self.config.headless, args=[f"--host-resolver-rules={rules}"])
        try:
            outcome = self._open(browser, clean_url, profile, mapped)
        finally:
            browser.close()
        outcome.isp_blocked = detour.isp_blocked
        return outcome

    def _open(self, browser, clean_url: str, profile: str,
              mapped: Optional[Dict[str, List[str]]]) -> ScrapeOutcome:
        cfg = self.config
        options: Dict[str, Any] = {"viewport": cfg.viewport, "user_agent": cfg.user_agent}
        options.update(PROFILES.get(profile, {}))
        context = browser.new_context(
            **options, locale="id-ID", timezone_id="Asia/Jakarta",
            accept_downloads=False, service_workers="block",
        )
        try:
            context.route("**/*", lambda route: self._guard(route, mapped))
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
            self._scroll(page)
            load_ms = int((time.monotonic() - started) * 1000)

            capture = self._capture(page, clean_url, response, load_ms,
                                    user_agent=str(options["user_agent"]), profile=profile)
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

    def _scroll(self, page) -> None:
        """Scroll pelan sampai beberapa layar supaya konten yang dimuat saat di-scroll ikut muncul."""
        try:
            height = (page.viewport_size or self.config.viewport)["height"]
            for _ in range(max(0, self.config.max_scroll_screens - 1)):
                page.evaluate("(h) => window.scrollBy(0, h)", height)
                page.wait_for_timeout(400)
            page.evaluate("() => window.scrollTo(0, 0)")
            page.wait_for_timeout(300)
        except Exception:
            pass  # halaman yang menolak scroll tetap diambil apa adanya

    def _capture(self, page, requested_url: str, response, load_ms: int,
                 user_agent: str = DEFAULT_USER_AGENT, profile: str = "desktop") -> PageCapture:
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

        # Teks halaman utama + isi iframe (spam judi sering disisipkan lewat iframe)
        parts = [safe(lambda: page.inner_text("body", timeout=5_000), "")]
        for frame in page.frames[1:MAX_FRAMES + 1]:
            frame_text = safe(lambda f=frame: f.inner_text("body", timeout=2_000), "")
            if frame_text.strip():
                parts.append(frame_text)
        text = "\n".join(parts)
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
            user_agent=user_agent,
            ocr_screenshot=self._long_screenshot(page),
            profile=profile,
        )

    def _long_screenshot(self, page) -> Optional[bytes]:
        """Screenshot dari atas sampai maks. `max_scroll_screens` layar, untuk OCR.

        None bila halaman tidak lebih panjang dari satu layar (layar pertama sudah cukup).
        """
        try:
            view = page.viewport_size or self.config.viewport
            page_height = page.evaluate(
                "() => Math.max(document.documentElement.scrollHeight,"
                " document.body ? document.body.scrollHeight : 0)")
            height = int(min(page_height, view["height"] * self.config.max_scroll_screens))
            if height <= view["height"]:
                return None
            image = page.screenshot(type="jpeg", quality=70, full_page=True, timeout=20_000,
                                    clip={"x": 0, "y": 0, "width": view["width"], "height": height})
            return image if len(image) <= MAX_SCREENSHOT_BYTES else None
        except Exception:
            return None

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
