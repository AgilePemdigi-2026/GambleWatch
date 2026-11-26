"""Tes pembuka link (detection_engine/scraper: safety, classify, fetcher).

Dipakai POST /scan di API deteksi. Tes worker antrean ada di test_scraper_worker.py.

Bagian unit tidak butuh internet maupun browser. Bagian integrasi membuka situs uji di
server HTTP lokal dengan Chromium headless; dilewati bila Playwright/Chromium belum terpasang
(`pip install playwright` lalu `python -m playwright install chromium`).
"""

import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, List

import pytest

from detection_engine.scraper.classify import classify_error, classify_page
from detection_engine.scraper.fetcher import FetchConfig, PageFetcher
from detection_engine.scraper.safety import (
    DnsFailure, UnsafeTarget, check_host, check_url, is_public_address, normalize_url,
)


def fake_resolver(table: Dict[str, List[str]]):
    def resolve(host: str):
        if host not in table:
            raise DnsFailure(host)
        return table[host]
    return resolve


# --- safety --------------------------------------------------------------------------

class TestNormalizeUrl:
    def test_adds_https_and_lowercases_host(self):
        assert normalize_url("  Slot-Gacor.XYZ/daftar#atas ") == "https://slot-gacor.xyz/daftar"

    def test_keeps_query_and_port(self):
        assert normalize_url("http://contoh.com:8080/a?b=1") == "http://contoh.com:8080/a?b=1"

    @pytest.mark.parametrize("url", [
        "", "file:///etc/passwd", "javascript:alert(1)", "ftp://contoh.com",
        "https://user:pass@contoh.com", "https://contoh.com:22/", "https:///tanpa-host",
    ])
    def test_rejects_unsafe(self, url):
        with pytest.raises(UnsafeTarget):
            normalize_url(url)


class TestCheckHost:
    @pytest.mark.parametrize("address", [
        "127.0.0.1", "10.1.2.3", "172.16.0.5", "192.168.1.1", "169.254.169.254",
        "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1",
    ])
    def test_non_public_addresses(self, address):
        assert not is_public_address(address)
        with pytest.raises(UnsafeTarget):
            check_host(address)

    def test_public_address(self):
        assert is_public_address("8.8.8.8")
        assert check_host("8.8.8.8") == ["8.8.8.8"]

    def test_domain_resolving_to_private_is_rejected(self):
        resolver = fake_resolver({"jebakan.test": ["10.0.0.7"]})
        with pytest.raises(UnsafeTarget):
            check_url("https://jebakan.test/", resolver=resolver)

    def test_any_private_record_is_rejected(self):
        resolver = fake_resolver({"campur.test": ["93.184.216.34", "192.168.0.10"]})
        with pytest.raises(UnsafeTarget):
            check_host("campur.test", resolver=resolver)

    def test_public_domain_allowed(self):
        resolver = fake_resolver({"situs.test": ["93.184.216.34"]})
        assert check_url("situs.test", resolver=resolver) == (
            "https://situs.test/", ["93.184.216.34"])

    def test_unknown_domain_is_dns_failure(self):
        with pytest.raises(DnsFailure):
            check_host("tidak-ada.test", resolver=fake_resolver({}))

    def test_allow_private_only_for_tests(self):
        assert check_host("127.0.0.1", allow_private=True) == ["127.0.0.1"]


# --- classify ------------------------------------------------------------------------

class TestClassify:
    def test_trustpositif_redirect_host(self):
        assert classify_page("https://internetpositif.uzone.id/", 200, "", "") == "BLOCKED"

    def test_short_block_page_text(self):
        text = "Maaf, situs ini diblokir karena mengandung konten negatif. Internet Positif."
        assert classify_page("https://slot88.xyz/", 200, "Blokir", text) == "BLOCKED"

    def test_long_article_mentioning_blocking_is_content(self):
        text = "Berita: situs ini diblokir Kominfo. " + "Isi artikel panjang. " * 300
        assert classify_page("https://berita.test/a", 200, "Berita", text) is None

    def test_cloudflare_challenge(self):
        assert classify_page("https://a.test/", 403, "Just a moment...", "") == "BOT_PROTECTION"

    def test_http_errors(self):
        assert classify_page("https://a.test/", 404, "Not Found", "tidak ada") == "HTTP_4XX"
        assert classify_page("https://a.test/", 502, "Bad Gateway", "error") == "HTTP_5XX"

    def test_normal_page(self):
        assert classify_page("https://a.test/", 200, "Slot Gacor", "daftar sekarang") is None

    @pytest.mark.parametrize("message,code", [
        ("Timeout 30000ms exceeded.", "TIMEOUT"),
        ("net::ERR_NAME_NOT_RESOLVED at https://x.test/", "DNS"),
        ("net::ERR_BLOCKED_BY_CLIENT at http://10.0.0.1/", "UNSAFE_TARGET"),
        ("net::ERR_CERT_DATE_INVALID", "TLS"),
        ("net::ERR_CONNECTION_REFUSED", "CONNECTION"),
        ("Page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://x.test/", "BOT_PROTECTION"),
        ("Download is starting", "DOWNLOAD"),
        ("sesuatu yang lain", "ERROR"),
    ])
    def test_classify_error(self, message, code):
        assert classify_error(message) == code


def test_fetch_rejects_private_url_before_opening_browser():
    fetcher = PageFetcher(FetchConfig())
    outcome = fetcher.fetch("http://127.0.0.1:8080/")
    assert outcome.status == "FAILED" and outcome.failure_code == "UNSAFE_TARGET"
    assert fetcher._browser is None   # browser tidak pernah dijalankan


def test_failed_browser_launch_can_be_retried(monkeypatch):
    """Chromium gagal dibuka sekali (mis. belum ter-install) tidak boleh merusak start() berikutnya."""
    pytest.importorskip("playwright")
    from playwright.sync_api import BrowserType

    real_launch = BrowserType.launch
    calls = {"n": 0}

    def flaky_launch(self, *args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("Executable doesn't exist")
        return real_launch(self, *args, **kwargs)

    monkeypatch.setattr(BrowserType, "launch", flaky_launch)
    fetcher = PageFetcher(FetchConfig())
    with pytest.raises(RuntimeError):
        fetcher.start()
    assert fetcher._playwright is None   # Playwright yang setengah jalan sudah dihentikan
    try:
        fetcher.start()
    except Exception as exc:  # Chromium memang tidak tersedia di mesin ini
        if "Sync API inside the asyncio loop" in str(exc):
            raise
        pytest.skip(f"Chromium Playwright tidak tersedia: {exc}")
    try:
        assert fetcher._browser is not None
    finally:
        fetcher.close()


def test_guard_blocks_private_subresource():
    resolver = fake_resolver({"situs.test": ["93.184.216.34"], "internal.test": ["10.0.0.2"]})
    fetcher = PageFetcher(FetchConfig(resolver=resolver))
    assert fetcher._host_allowed("situs.test")
    assert not fetcher._host_allowed("internal.test")
    assert not fetcher._host_allowed("169.254.169.254")


# --- integrasi: Chromium sungguhan + situs uji lokal ---------------------------------------

GAMBLING_PAGE = """<!doctype html><html><head><title>SLOT GACOR 88 Login</title>
<meta name="description" content="Situs slot gacor maxwin terpercaya"></head>
<body><h1>Daftar Slot Gacor Hari Ini</h1>
<p>Bonus new member 100%, deposit pulsa tanpa potongan, RTP live tertinggi, maxwin x500.</p>
<a href="https://link-alternatif-slot88.xyz/daftar">Link alternatif</a>
<a href="/login">Login</a></body></html>"""

BLOCK_PAGE = """<!doctype html><html><head><title>Internet Positif</title></head>
<body><p>Maaf, situs ini diblokir karena mengandung konten negatif.</p></body></html>"""


FRAME_PAGE = """<!doctype html><html><head><title>Beranda Kampus</title></head>
<body><h1>Selamat datang</h1><iframe src="/isi_bingkai.html" width="600" height="200"></iframe></body></html>"""

FRAME_CONTENT = """<!doctype html><html><body><p>Link alternatif slot gacor maxwin terbaru</p></body></html>"""

LONG_PAGE = """<!doctype html><html><head><title>Artikel</title></head>
<body style="margin:0"><div style="height:2600px;background:linear-gradient(#fff,#ddd)">Isi artikel</div>
<p>Penutup halaman</p></body></html>"""

MOBILE_PAGE = """<!doctype html><html><head><title>Beranda</title></head><body><p id="isi">Toko online</p>
<script>if (/Android/.test(navigator.userAgent)) document.getElementById('isi').textContent = 'Promo khusus HP: slot gacor';</script>
</body></html>"""


@pytest.fixture(scope="module")
def local_site(tmp_path_factory):
    root = tmp_path_factory.mktemp("situs")
    (root / "index.html").write_text(GAMBLING_PAGE, encoding="utf-8")
    (root / "blokir.html").write_text(BLOCK_PAGE, encoding="utf-8")
    (root / "bingkai.html").write_text(FRAME_PAGE, encoding="utf-8")
    (root / "isi_bingkai.html").write_text(FRAME_CONTENT, encoding="utf-8")
    (root / "panjang.html").write_text(LONG_PAGE, encoding="utf-8")
    (root / "hp.html").write_text(MOBILE_PAGE, encoding="utf-8")

    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


@pytest.fixture(scope="module")
def browser_fetcher():
    pytest.importorskip("playwright")
    # Situs uji ada di 127.0.0.1 dengan port acak, jadi pemeriksaan port/alamat
    # dilonggarkan khusus di tes ini.
    import detection_engine.scraper.safety as safety
    original_ports = safety.ALLOWED_PORTS
    safety.ALLOWED_PORTS = tuple([None]) + tuple(range(1, 65536))
    fetcher = PageFetcher(FetchConfig(allow_private=True, nav_timeout_ms=15_000, settle_ms=500))
    try:
        fetcher.start()
    except Exception as exc:  # Chromium belum di-install
        safety.ALLOWED_PORTS = original_ports
        pytest.skip(f"Chromium Playwright tidak tersedia: {exc}")
    yield fetcher
    fetcher.close()
    safety.ALLOWED_PORTS = original_ports


def test_scrape_local_gambling_page(local_site, browser_fetcher):
    outcome = browser_fetcher.fetch(f"{local_site}/index.html")

    assert outcome.status == "SUCCESS", outcome.failure_message
    capture = outcome.capture
    assert capture.http_status == 200
    assert capture.title == "SLOT GACOR 88 Login"
    assert "deposit pulsa" in capture.text
    assert capture.meta_description == "Situs slot gacor maxwin terpercaya"
    assert "https://link-alternatif-slot88.xyz/daftar" in capture.outbound_links
    assert capture.screenshot and capture.screenshot.startswith(b"\x89PNG")


def test_scrape_local_block_page(local_site, browser_fetcher):
    outcome = browser_fetcher.fetch(f"{local_site}/blokir.html")
    assert outcome.status == "BLOCKED" and outcome.capture is not None


def test_scrape_missing_page(local_site, browser_fetcher):
    outcome = browser_fetcher.fetch(f"{local_site}/tidak-ada.html")
    assert outcome.status == "FAILED" and outcome.failure_code == "HTTP_4XX"


def test_iframe_text_is_included(local_site, browser_fetcher):
    outcome = browser_fetcher.fetch(f"{local_site}/bingkai.html")
    assert outcome.status == "SUCCESS", outcome.failure_message
    assert "slot gacor maxwin" in outcome.capture.text


def test_long_page_gets_ocr_screenshot_up_to_three_screens(local_site, browser_fetcher):
    import io

    from PIL import Image

    outcome = browser_fetcher.fetch(f"{local_site}/panjang.html")
    assert outcome.capture.ocr_screenshot is not None
    height = Image.open(io.BytesIO(outcome.capture.ocr_screenshot)).height
    assert 900 < height <= 900 * 3
    # halaman satu layar tidak butuh screenshot panjang
    assert browser_fetcher.fetch(f"{local_site}/index.html").capture.ocr_screenshot is None


def test_mobile_profile_sees_mobile_only_content(local_site, browser_fetcher):
    desktop = browser_fetcher.fetch(f"{local_site}/hp.html")
    mobile = browser_fetcher.fetch(f"{local_site}/hp.html", profile="mobile")
    assert "slot gacor" not in desktop.capture.text
    assert "slot gacor" in mobile.capture.text
    assert mobile.capture.profile == "mobile"


@pytest.mark.parametrize("title,text", [
    ("Attention Required! | Cloudflare", "Sorry, you have been blocked"),
    ("", "filmfreeway.com Performing security verification This website uses a security service"),
])
def test_cloudflare_block_pages_are_bot_protection(title, text):
    assert classify_page("https://a.test/", 403, title, text) == "BOT_PROTECTION"
