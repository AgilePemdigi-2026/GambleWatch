"""DET-01: pola URL. Tes untuk satu detektor ini saja.

Jalankan dari root repo:

    pytest tests/test_det01_url_pattern.py -v        # lulus/gagal per URL
    python tests/test_det01_url_pattern.py           # tabel contoh bawaan
    python tests/test_det01_url_pattern.py --samples # semua URL di data/samples/urls.csv
    python tests/test_det01_url_pattern.py https://situs-anda.com   # URL sendiri,
                                                                    # lengkap dengan aturan yang cocok
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from detection_engine.detectors.det01_url_pattern.url_pattern_detector import URLPatternDetector
from tests.samples import needs_samples

HIGH_RISK = [
    "https://slotgacor88.bet",
    "https://togelonline.id",
    "https://judi.com",
    "https://bola-slot.xyz",
    "https://situs-slot777.com",
    "https://sbobet.com",
    "https://bandar-togel-resmi.net",
    "https://casino-royale.win",
    "https://example.com/slot/daftar",
    "https://dewabet88.com",        # merek berakhiran "bet" (jangan terhapus oleh daftar kata biasa)
    "https://pasarbet.com",
    "https://weton88.com",          # nama situs dari spam komentar judol
    "https://link.alexis17.net/daftar",
    "https://pstoto99.org",
    "https://kusumatoto.xyz",
    "https://livedrawsgp.info",
    "https://slotzeus.vip",
    "https://zeus123.xyz",          # <kata><angka>, pola merek judi
    "https://zeus8.com",
    "https://mpo500king.com",
    "https://hoki138panther.com",
    "https://slots88.gumroad.com",
    "https://contoh.fr/id/live-draw-sgp.html",       # hasil undian togel
    "https://contoh.gumroad.com/l/RTPPragmaticPlay",  # "/rtp" menempel nama permainan
]

NORMAL = [
    "https://google.com",
    "https://tokopedia.com",
    "https://classroom.google.com",
    "https://alphabet.com",
    "https://bandarlampung.go.id",
    "https://ayampotong.co.id",
    "https://kompas.com/bola/liga-1",
    "https://togel.go.id",
    "https://alfabet.id",           # "alfabet" = alphabet dalam bahasa Indonesia
    "https://better.com",
    "https://www.zeus.com",          # kata ambigu sendirian tidak cukup
    "https://www.olympus-global.com",
    "https://www.toto.co.id",
    "https://mahjong.games/online",
    "https://matplotlib.org/stable/gallery/scatter",
    "https://tempo24.news",          # "mpo" di dalam "tempo"
    "https://dewa19.com",            # band Dewa 19
    "https://ufa1.ru",               # kota Ufa
    "https://mahjong4friends.com",
    "https://king5.com",             # stasiun TV
]


# Halaman situs biasa yang dulu salah dinilai (cross-check 04/11/2026). Untuk
# formulir yang hanya berisi URL, skor DET-01 menjadi skor akhir, jadi harus
# tetap di bawah ambang Sedang, bukan sekadar di bawah "High Risk Pattern".
ORDINARY_PAGES = [
    "https://bri.co.id/deposito",              # "/deposit" di dalam "/deposito"
    "https://www.tokopedia.com/login",         # halaman login biasa
    "https://www.detik.com/daftar-harga-hp",   # "daftar" = list
    "https://www.bola.com/liverpool",          # "/live" di dalam "/liverpool"
    "https://www.placement.co.id",             # "ceme" di dalam "placement"
    "https://www.diabetes.co.id",              # "bet" di dalam "diabetes"
    "https://www.dominos.co.id/promo",         # merek pizza + halaman promo
    "https://www.example.com/news/announcement",
    "https://www.komdigi.go.id/berita/blokir-situs-slot-dan-togel",  # berita pemerintah
    "https://www.klinik.co.id/layanan/rtpcr",  # tes COVID, bukan RTP slot
]


@pytest.fixture(scope="module")
def detector():
    return URLPatternDetector()


@pytest.mark.parametrize("url", ORDINARY_PAGES)
def test_ordinary_pages_stay_below_sedang(detector, url):
    from detection_engine.config.detection_config import config
    result = detector.detect(url)
    assert result.score < config.indication_medium_threshold, (
        f"{url} scored {result.score:.2f}: "
        f"{[r['details'] for r in result.evidence['matched_rules']]}")


def test_indonesian_second_level_domain_is_not_a_deep_subdomain(detector):
    """www.contoh.co.id hanya punya satu subdomain (www), bukan bersarang."""
    rules = [r["rule"] for r in detector.detect("https://www.contoh.co.id").evidence["matched_rules"]]
    assert "deep_subdomain" not in rules


def test_domain_keyword_is_counted_once(detector):
    rules = detector.detect("https://www.togelonline.co.id").evidence["matched_rules"]
    togel = [r for r in rules if "'togel'" in r["details"]]
    assert len(togel) == 1, [r["details"] for r in rules]


def test_port_and_login_part_are_not_read_as_domain(detector):
    assert detector.detect("https://slot@example.com:8080/").score < 0.4


def test_generic_path_supports_real_gambling_evidence(detector):
    """'/deposit' sendirian tidak berarti apa-apa, tetapi menambah bukti di situs judi."""
    plain = detector.detect("https://slotgacor88.xyz").score
    with_deposit = detector.detect("https://slotgacor88.xyz/deposit").score
    assert with_deposit > plain


def test_hacked_government_page_with_gambling_spam_is_not_damped(detector):
    """Spam judi di situs .go.id yang diretas tidak boleh diredam seperti situs resmi."""
    result = detector.detect("https://dinkes.contohkab.go.id/slot-gacor-maxwin/")
    assert result.score >= 0.4, f"skor {result.score:.2f}"


@pytest.mark.parametrize("url", HIGH_RISK)
def test_gambling_urls_are_high_risk(detector, url):
    result = detector.detect(url)
    assert result.label == "High Risk Pattern", f"{url} scored {result.score:.2f}"


@pytest.mark.parametrize("url", NORMAL)
def test_legitimate_urls_are_normal(detector, url):
    result = detector.detect(url)
    assert result.label == "Normal", f"{url} scored {result.score:.2f}"


# --- Data nyata dari data/samples/urls.csv (dibuat oleh scripts/build_urls_csv.py) ---

def _sample_rows():
    from tests.samples import url_rows
    return url_rows()


@needs_samples
def test_sample_normal_urls_are_never_flagged(detector):
    """Situs biasa dan halaman yang hanya membahas judi tidak boleh 'High Risk'."""
    rows = [r for r in _sample_rows() if r["label"] in ("normal", "mirip_tapi_bukan")]
    flagged = [r["url"] for r in rows if detector.detect(r["url"]).label == "High Risk Pattern"]
    assert rows and not flagged, f"salah ditandai: {flagged}"


@needs_samples
@pytest.mark.xfail(strict=False, reason=(
    "Celah terukur (contoh 29/10/2026): hanya 21 dari 40 URL judi yang kata judinya "
    "terlihat lolos ambang. Kata judi di path/username platform (gitlab.com/diantogelcom, "
    "hub.docker.com/r/.../fun88) berbobot 0.4x sehingga satu kata saja tidak cukup. "
    "Menaikkannya mengurangi yang terlewat tetapi menambah slug berita yang salah ditandai."))
def test_sample_gambling_urls_with_visible_words_are_caught(detector):
    """URL judi yang kata judinya terlihat di URL harus lolos ambang, minimal 80%.

    URL judi yang tidak memuat kata apa pun (spam di domain sah, mis. profil
    di platform) memang di luar jangkauan DET-01 dan tidak dihitung di sini.
    """
    rows = [r for r in _sample_rows()
            if r["label"] == "judi" and r["url_menunjukkan_judi"] == "ya"]
    missed = [r["url"] for r in rows if detector.detect(r["url"]).label != "High Risk Pattern"]
    recall = 1 - len(missed) / len(rows)
    assert rows and recall >= 0.8, f"recall {recall:.0%}, terlewat: {missed}"


def show_samples(detector) -> int:
    rows = _sample_rows()
    if not rows:
        print("data/samples/urls.csv belum ada. Buat: python scripts/build_urls_csv.py")
        return 2
    print(f"{'':3}{'Label':17}{'Kata di URL':12} {'Hasil':18} {'Skor':5} URL")
    for r in rows:
        result = detector.detect(r["url"])
        flagged = result.label == "High Risk Pattern"
        if r["label"] == "judi":
            ok = flagged if r["url_menunjukkan_judi"] == "ya" else None
        else:
            ok = not flagged
        mark = "OK" if ok else ("n/a" if ok is None else "XX")
        print(f"{mark:3}{r['label']:17}{r['url_menunjukkan_judi']:12} {result.label:18} "
              f"{result.score:.2f}  {r['url'][:70]}")
    print("\nn/a = URL judi tanpa kata judi di dalamnya: di luar jangkauan DET-01 (ditangkap DET-03/04)")
    return 0


def main(argv) -> int:
    detector = URLPatternDetector()

    if argv == ["--samples"]:  # semua URL di data/samples/urls.csv
        return show_samples(detector)

    if argv:  # URL milik sendiri: tampilkan hasil dan aturan yang cocok
        for url in argv:
            result = detector.detect(url)
            print(f"{result.label:18} skor {result.score:.2f}  {url}")
            for rule in (result.evidence or {}).get("matched_rules", []):
                print(f"    +{rule['weight']:.2f}  {rule['details']}")
        return 0

    print(f"{'':3}{'Harapan':18} {'Hasil':18} {'Skor':5} URL")
    wrong = 0
    for expected, urls in (("High Risk Pattern", HIGH_RISK), ("Normal", NORMAL)):
        for url in urls:
            result = detector.detect(url)
            ok = result.label == expected
            wrong += not ok
            print(f"{'OK' if ok else 'XX':3}{expected:18} {result.label:18} {result.score:.2f}  {url}")
    total = len(HIGH_RISK) + len(NORMAL)
    print(f"\n{total - wrong}/{total} sesuai harapan")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
