"""DNS publik (DoH) untuk domain yang diblokir DNS provider (Internet Positif).

Tanpa jaringan: DNS sistem dan DoH diganti fungsi palsu.
"""

import io
import json

import pytest

from detection_engine.scraper import safety
from detection_engine.scraper.fetcher import FetchConfig, PageFetcher
from detection_engine.scraper.safety import DnsFailure, doh_resolver, find_dns_detour


def lookup_table(answers):
    def lookup(host):
        if host not in answers:
            raise DnsFailure(f"{host}: tidak ada")
        return answers[host]
    return lookup


def test_isp_redirect_to_block_page_is_detoured():
    detour = find_dns_detour(
        "zeus138rex.com",
        system=lookup_table({"zeus138rex.com": (["202.169.44.80"], "rpz.biznet")}),
        public=lookup_table({"zeus138rex.com": ["185.148.104.116"]}))
    assert detour is not None
    assert detour.addresses == ["185.148.104.116"] and detour.isp_blocked


def test_isp_nxdomain_but_public_dns_answers_counts_as_blocked():
    detour = find_dns_detour("slot.example", system=lookup_table({}),
                             public=lookup_table({"slot.example": ["93.184.216.34"]}))
    assert detour is not None and detour.isp_blocked


def test_isp_answering_loopback_counts_as_blocked():
    # Beberapa provider menjawab ::1 untuk domain yang diblokir
    detour = find_dns_detour(
        "www.ivoox.com",
        system=lookup_table({"www.ivoox.com": (["::1", "202.3.218.137"], "www.ivoox.com")}),
        public=lookup_table({"www.ivoox.com": ["77.73.84.19"]}))
    assert detour is not None and detour.isp_blocked


def test_private_answer_without_public_alternative_stays_unsafe(monkeypatch):
    monkeypatch.setattr("detection_engine.scraper.fetcher.find_dns_detour", lambda host: None)
    fetcher = PageFetcher(FetchConfig(public_dns=True))
    monkeypatch.setattr(fetcher, "_dns_detour", lambda host: None)
    outcome = fetcher.fetch("http://127.0.0.1:8080/")
    assert outcome.failure_code == "UNSAFE_TARGET" and fetcher._browser is None


def test_same_answer_needs_no_detour():
    assert find_dns_detour(
        "unair.ac.id",
        system=lookup_table({"unair.ac.id": (["210.57.208.1"], "unair.ac.id")}),
        public=lookup_table({"unair.ac.id": ["210.57.208.1"]})) is None


def test_different_cdn_address_is_detoured_without_block_flag():
    detour = find_dns_detour(
        "cdn.example",
        system=lookup_table({"cdn.example": (["1.1.1.10"], "edge.cdn.net")}),
        public=lookup_table({"cdn.example": ["1.1.1.20"]}))
    assert detour is not None and not detour.isp_blocked


def test_public_dns_unavailable_falls_back_to_system():
    assert find_dns_detour(
        "zeus138rex.com",
        system=lookup_table({"zeus138rex.com": (["202.169.44.80"], "rpz.biznet")}),
        public=lookup_table({})) is None


def test_ip_literal_is_never_detoured():
    assert find_dns_detour("93.184.216.34", system=lookup_table({}),
                           public=lookup_table({})) is None


class _Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


def test_doh_resolver_reads_a_records_and_skips_cname(monkeypatch):
    payload = {"Status": 0, "Answer": [
        {"type": 5, "data": "alias.example."},
        {"type": 1, "data": "185.148.104.116"},
    ]}
    monkeypatch.setattr(safety, "urlopen",
                        lambda request, timeout: _Response(json.dumps(payload).encode()))
    assert doh_resolver("zeus138rex.com") == ["185.148.104.116"]


def test_doh_resolver_tries_next_endpoint_then_reports_nxdomain(monkeypatch):
    calls = []

    def fake(request, timeout):
        calls.append(request.full_url)
        if len(calls) == 1:
            raise OSError("cloudflare tidak dapat dihubungi")
        return _Response(json.dumps({"Status": 3}).encode())

    monkeypatch.setattr(safety, "urlopen", fake)
    with pytest.raises(DnsFailure):
        doh_resolver("tidak-ada.example")
    assert len(calls) == 2


@pytest.mark.parametrize("config", [
    FetchConfig(public_dns=False),
    FetchConfig(allow_private=True),
    FetchConfig(resolver=lambda host: ["93.184.216.34"]),
])
def test_fetcher_skips_public_dns_when_disabled_or_in_tests(config, monkeypatch):
    monkeypatch.setattr("detection_engine.scraper.fetcher.find_dns_detour",
                        lambda host: pytest.fail("DNS publik tidak boleh dipakai"))
    assert PageFetcher(config)._dns_detour("zeus138rex.com") is None


def test_public_dns_can_be_switched_off_by_env(monkeypatch):
    monkeypatch.setenv("GAMBLEWATCH_PUBLIC_DNS", "0")
    assert FetchConfig().public_dns is False
