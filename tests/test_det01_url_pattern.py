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
]


@pytest.fixture(scope="module")
def detector():
    return URLPatternDetector()


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
