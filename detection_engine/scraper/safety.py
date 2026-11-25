"""Pemeriksaan alamat sebelum scraper membuka URL (pencegahan SSRF).

Scraper berjalan di server yang juga menjalankan Supabase, API deteksi, dan layanan lain.
URL dari laporan masyarakat tidak boleh dipakai untuk menjangkau alamat internal
(127.0.0.1, 10.x, 192.168.x, 169.254.169.254 metadata cloud, dst.), jadi setiap host
di-resolve dulu dan hanya alamat publik yang diizinkan. Pemeriksaan yang sama dipakai
ulang untuk setiap request di dalam browser (redirect, gambar, skrip), lihat fetcher.py.
"""

import ipaddress
import json
import socket
from dataclasses import dataclass
from typing import Callable, Iterable, List, Optional, Tuple
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

ALLOWED_SCHEMES = ("http", "https")
ALLOWED_PORTS = (None, 80, 443, 8080, 8443)
MAX_URL_LENGTH = 2048

Resolver = Callable[[str], Iterable[str]]


class UnsafeTarget(ValueError):
    """URL tidak boleh dibuka (skema/port/alamat tidak diizinkan)."""


class DnsFailure(ValueError):
    """Host tidak bisa di-resolve (domain tidak ada atau sudah mati)."""


def normalize_url(raw: str) -> str:
    """Rapikan URL masukan: tambah https:// bila tanpa skema, kecilkan host, buang #fragmen.

    Menolak skema selain http/https, URL tanpa host, dan URL berisi kredensial (user:pass@).
    """
    text = (raw or "").strip()
    if not text:
        raise UnsafeTarget("URL kosong")
    if len(text) > MAX_URL_LENGTH:
        raise UnsafeTarget("URL terlalu panjang")
    if "://" not in text:
        text = "https://" + text

    parts = urlsplit(text)
    scheme = parts.scheme.lower()
    if scheme not in ALLOWED_SCHEMES:
        raise UnsafeTarget(f"skema '{scheme}' tidak diizinkan")
    if parts.username or parts.password:
        raise UnsafeTarget("URL berisi kredensial")
    host = (parts.hostname or "").rstrip(".").lower()
    if not host:
        raise UnsafeTarget("URL tanpa host")
    try:
        port = parts.port
    except ValueError:
        raise UnsafeTarget("port tidak valid")
    if port not in ALLOWED_PORTS:
        raise UnsafeTarget(f"port {port} tidak diizinkan")

    netloc = f"[{host}]" if ":" in host else host
    if port:
        netloc = f"{netloc}:{port}"
    return urlunsplit((scheme, netloc, parts.path or "/", parts.query, ""))


def is_public_address(address: str) -> bool:
    """True hanya untuk alamat internet publik (bukan privat, loopback, link-local, dst.)."""
    try:
        ip = ipaddress.ip_address(address.split("%", 1)[0])
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


def _system_resolver(host: str) -> List[str]:
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise DnsFailure(f"{host}: {exc}") from exc
    return sorted({str(info[4][0]) for info in infos})


def check_host(host: str, resolver: Optional[Resolver] = None,
               allow_private: bool = False) -> List[str]:
    """Resolve host dan pastikan SEMUA alamatnya publik. Mengembalikan daftar alamat.

    Semua alamat diperiksa, bukan hanya yang pertama: domain bisa punya beberapa
    record A dan browser bebas memilih salah satunya.
    """
    host = host.strip("[]").rstrip(".").lower()
    try:
        ipaddress.ip_address(host.split("%", 1)[0])
        addresses = [host]
    except ValueError:
        addresses = list((resolver or _system_resolver)(host))
        if not addresses:
            raise DnsFailure(f"{host}: tidak ada alamat")

    if not allow_private:
        bad = [a for a in addresses if not is_public_address(a)]
        if bad:
            raise UnsafeTarget(f"{host} mengarah ke alamat non-publik {', '.join(bad)}")
    return addresses


def check_url(url: str, resolver: Optional[Resolver] = None,
              allow_private: bool = False) -> Tuple[str, List[str]]:
    """normalize_url + check_host. Mengembalikan (url_rapi, alamat)."""
    clean = normalize_url(url)
    host = urlsplit(clean).hostname or ""
    return clean, check_host(host, resolver=resolver, allow_private=allow_private)


# --- DNS publik (DoH): lewati blokir DNS provider ---------------------------------------
#
# Provider di Indonesia (Internet Positif/Kominfo) memblokir situs judi lewat DNS: domain
# dialihkan ke halaman blokir atau dijawab "tidak ada". Browser pengguna yang memakai Secure
# DNS tetap bisa membuka situsnya, jadi scanner juga harus bisa melihat isi aslinya.
# Alamat dicari lewat DNS-over-HTTPS publik; bila jawabannya berbeda total dengan DNS
# sistem, Chromium diarahkan ke alamat publik itu (lihat fetcher.py) dan alamat tersebut
# diperiksa is_public_address seperti biasa.

DOH_ENDPOINTS = ("https://cloudflare-dns.com/dns-query", "https://dns.google/resolve")
DOH_TIMEOUT = 5.0
# Tanda jawaban DNS sistem adalah pengalihan blokir (nama kanonis hasil CNAME/RPZ provider)
BLOCK_MARKERS = ("positif", "rpz", "nawala", "blokir")


def system_lookup(host: str) -> Tuple[List[str], str]:
    """DNS sistem: (alamat, nama kanonis). Nama kanonis memperlihatkan pengalihan blokir."""
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP, flags=socket.AI_CANONNAME)
    except socket.gaierror as exc:
        raise DnsFailure(f"{host}: {exc}") from exc
    canon = next((str(info[3]) for info in infos if info[3]), "")
    return sorted({str(info[4][0]) for info in infos}), canon


def doh_resolver(host: str, endpoints: Iterable[str] = DOH_ENDPOINTS,
                 timeout: float = DOH_TIMEOUT) -> List[str]:
    """Record A lewat DNS-over-HTTPS (format JSON). Endpoint berikutnya dicoba bila gagal."""
    last = "DNS publik tidak dapat dihubungi"
    for endpoint in endpoints:
        url = f"{endpoint}?{urlencode({'name': host, 'type': 'A'})}"
        try:
            with urlopen(Request(url, headers={"accept": "application/dns-json"}),
                         timeout=timeout) as response:
                data = json.load(response)
        except (OSError, ValueError) as exc:
            last = str(exc)
            continue
        if data.get("Status") == 3:
            raise DnsFailure(f"{host}: domain tidak ditemukan (DNS publik)")
        addresses = sorted({str(answer["data"]) for answer in data.get("Answer") or []
                            if answer.get("type") == 1 and answer.get("data")})
        if addresses:
            return addresses
        last = "tidak ada record A"
    raise DnsFailure(f"{host}: {last}")


@dataclass
class DnsDetour:
    addresses: List[str]   # alamat dari DNS publik yang dipakai Chromium
    isp_blocked: bool      # DNS sistem jelas mengalihkan/menolak domain ini


def find_dns_detour(host: str,
                    system: Callable[[str], Tuple[List[str], str]] = system_lookup,
                    public: Resolver = doh_resolver) -> Optional[DnsDetour]:
    """None bila DNS sistem dan DNS publik sepakat (atau DNS publik tidak tersedia)."""
    host = host.strip("[]").rstrip(".").lower()
    try:
        ipaddress.ip_address(host.split("%", 1)[0])
        return None
    except ValueError:
        pass
    try:
        system_addresses, canon = system(host)
        system_failed = False
    except DnsFailure:
        system_addresses, canon, system_failed = [], "", True
    try:
        public_addresses = list(public(host))
    except DnsFailure:
        return None
    if not public_addresses or set(system_addresses) & set(public_addresses):
        return None
    blocked = system_failed or any(marker in canon.lower() for marker in BLOCK_MARKERS)
    return DnsDetour(addresses=public_addresses, isp_blocked=blocked)
