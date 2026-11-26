"""Aturan bersama POST /scan dan worker: kapan halaman dibuka ulang dengan profil lain.

Halaman yang tampak bersih dicoba lagi sebagai pengunjung dari Google (situs yang diretas
sering hanya menampilkan spam judi ke mesin pencari: cloaking) dan sebagai pengunjung HP.
Halaman yang MEMBAHAS judi (berita, ensiklopedia) tidak dicoba ulang: isinya sudah dinilai,
dan versi HP-nya sering lebih pendek sehingga konteks informatifnya hilang.
"""

from typing import Any, Dict, Optional

RETRY_PROFILES = ("search", "mobile")
CLOAKING_GAP = 0.3   # selisih skor tampilan "dari Google" vs biasa yang dianggap cloaking


def mentions_gambling(summary: Dict[str, Any]) -> bool:
    """True bila teks halaman atau OCR menemukan kata judi apa pun."""
    modules = summary.get("modules") or {}
    return any((modules.get(key) or {}).get("findings") for key in ("keyword_analysis", "ocr"))


def should_retry(opened: bool, summary: Optional[Dict[str, Any]]) -> bool:
    """Coba profil lain hanya bila halaman terbuka, dinilai rendah, dan sama sekali tidak menyebut judi."""
    return bool(opened and summary and summary.get("overall_risk") == "low"
                and not mentions_gambling(summary))


def is_cloaking(desktop_score: float, search_score: Optional[float], best_risk: str) -> bool:
    """Versi "dari Google" jauh lebih berisiko daripada versi biasa."""
    return (search_score is not None and search_score - desktop_score >= CLOAKING_GAP
            and best_risk != "low")


CLOAKING_MESSAGE = ("Situs menampilkan konten judi hanya kepada pengunjung dari mesin pencari "
                    "(cloaking). Ini tanda kuat situs telah diretas.")
