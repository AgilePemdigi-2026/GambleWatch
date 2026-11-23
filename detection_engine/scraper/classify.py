"""Menggolongkan halaman hasil scraping yang bukan konten situs sebenarnya.

Kode yang dihasilkan sama dengan kolom scrape_jobs.failure_code (docs/RANCANGAN_SCRAPER.md §5.4):

    BLOCKED          halaman blokir Internet Positif / TrustPositif. Bukan kegagalan:
                     situs sudah diblokir pemerintah (server di Indonesia kena filter ini).
    BOT_PROTECTION   tantangan Cloudflare / DDoS-Guard / "verify you are human".
    HTTP_4XX / 5XX   halaman error dari server situs.
"""

import re
from typing import Optional
from urllib.parse import urlsplit

# Host halaman pengalihan blokir milik ISP/Komdigi
BLOCK_PAGE_HOSTS = (
    "internetpositif", "trustpositif", "aduankonten", "internet-positif",
    "mercusuar.uzone.id", "blockpage", "nawala",
)

# Teks khas halaman blokir. Dicocokkan hanya pada halaman pendek, karena situs berita
# juga bisa menulis "diblokir Kominfo" di dalam artikel.
BLOCK_PAGE_TEXT = re.compile(
    r"internet\s*positif|trust\s*positif|situs\s+ini\s+(?:telah\s+)?diblokir"
    r"|konten\s+negatif|halaman\s+ini\s+diblokir|akses\s+(?:ke\s+)?situs\s+ini\s+diblokir",
    re.IGNORECASE)
BLOCK_PAGE_MAX_CHARS = 3000

BOT_TITLES = re.compile(
    r"^(?:just a moment|attention required|please wait|ddos-guard|checking your browser"
    r"|security check|one more step)", re.IGNORECASE)
BOT_TEXT = re.compile(
    r"checking (?:if the site connection is secure|your browser)|verify you are (?:a )?human"
    r"|enable javascript and cookies to continue|ddos protection by|cf-chl|ray id:",
    re.IGNORECASE)
BOT_PAGE_MAX_CHARS = 2000


def is_block_page(final_url: str, text: str) -> bool:
    host = (urlsplit(final_url or "").hostname or "").lower()
    if any(marker in host for marker in BLOCK_PAGE_HOSTS):
        return True
    body = (text or "").strip()
    return len(body) <= BLOCK_PAGE_MAX_CHARS and bool(BLOCK_PAGE_TEXT.search(body))


def is_bot_challenge(title: str, text: str) -> bool:
    if BOT_TITLES.search((title or "").strip()):
        return True
    body = (text or "").strip()
    return len(body) <= BOT_PAGE_MAX_CHARS and bool(BOT_TEXT.search(body))


def classify_page(final_url: str, http_status: Optional[int], title: str,
                  text: str) -> Optional[str]:
    """Kode kegagalan untuk halaman ini, atau None bila halaman berisi konten situs."""
    if is_block_page(final_url, text):
        return "BLOCKED"
    if is_bot_challenge(title, text):
        return "BOT_PROTECTION"
    if http_status is not None:
        if 400 <= http_status < 500:
            return "HTTP_4XX"
        if http_status >= 500:
            return "HTTP_5XX"
    return None


def classify_error(message: str) -> str:
    """Kode kegagalan dari pesan error Playwright/Chromium saat membuka halaman."""
    msg = message or ""
    if "Timeout" in msg or "ERR_TIMED_OUT" in msg:
        return "TIMEOUT"
    if "ERR_NAME_NOT_RESOLVED" in msg or "ERR_NAME_RESOLUTION_FAILED" in msg:
        return "DNS"
    if "ERR_BLOCKED_BY_CLIENT" in msg:
        return "UNSAFE_TARGET"   # route guard menolak alamat non-publik
    if "ERR_CERT" in msg or "ERR_SSL" in msg:
        return "TLS"
    if "ERR_HTTP2_PROTOCOL_ERROR" in msg:
        return "BOT_PROTECTION"  # biasanya anti-bot (mis. Akamai) memutus browser headless
    if "Download is starting" in msg or ("ERR_ABORTED" in msg and "download" in msg.lower()):
        return "DOWNLOAD"
    if any(code in msg for code in ("ERR_CONNECTION", "ERR_ADDRESS_UNREACHABLE",
                                    "ERR_EMPTY_RESPONSE", "ERR_NETWORK", "ERR_TUNNEL")):
        return "CONNECTION"
    return "ERROR"
