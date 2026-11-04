#!/usr/bin/env python3
"""Build data/samples/urls.csv, the labelled URL list used by the DET-01 tests.

Run from the repo root (after the page collection has produced manifest.json):
    python scripts/build_urls_csv.py

Rows come from three sources, kept apart in the `sumber` column:
    halaman_diambil   pages that were actually opened (manifest.json)
    hasil_pencarian   gambling URLs seen in search results, NOT opened
    berita            domains named in news reports of police cases, NOT opened
    daftar_umum       ordinary well-known sites, NOT opened

`url_menunjukkan_judi` is "ya" when the URL text itself contains an obvious
gambling word; DET-01 can only be expected to catch those.
"""

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.samples import ROOT, url_shows_gambling  # noqa: E402

# (url, catatan) -- terlihat di hasil pencarian untuk kata kunci judi; tidak dibuka
SEARCH_GAMBLING = [
    ("https://hub.docker.com/r/joinslotgacor/rtp-slot-gacor-hari-ini", "spam di Docker Hub"),
    ("https://hub.docker.com/r/bettings88/m88", "spam di Docker Hub"),
    ("https://hub.docker.com/r/juliowallace/fun88", "spam di Docker Hub"),
    ("https://rtppragmatic369.gumroad.com/l/RTPPragmaticPlay", "spam di Gumroad"),
    ("https://gitlab.com/diantogelcom", "spam di GitLab"),
    ("https://gitlab.com/ole777alt", "spam di GitLab"),
    ("https://scrapbox.io/tv888comco1/tv888comco", "spam di Scrapbox"),
    ("https://independent.academia.edu/88BET1", "spam di academia.edu"),
    ("https://www.sqlservercentral.com/forums/user/888vipbet", "spam di forum"),
    ("https://www.elite-auto.fr/id/m88-slot-online.html", "situs diretas (cloaking)"),
    ("https://www.elite-auto.fr/id/piala88-slot-online.html", "situs diretas (cloaking)"),
    ("https://www.elite-auto.fr/id/pertiwi88-slot-online.html", "situs diretas (cloaking)"),
    ("https://www.elite-auto.fr/id/apk-7bet.html", "situs diretas (cloaking)"),
    ("https://www.elite-auto.fr/id/toto-hongkong-bet-net.html", "situs diretas (cloaking)"),
    ("https://www.elite-auto.fr/id/live-draw-hanoi.html", "situs diretas (cloaking)"),
    ("https://www.elite-auto.fr/id/slot-new-member-100-persen.html", "situs diretas (cloaking)"),
]

# Domain yang disebut persis di berita kasus polisi; tidak dibuka
NEWS_GAMBLING = [
    ("https://1xbetindo.com", "kasus Bareskrim 1XBET"),
    ("https://www.tahu69586.site/", "kasus Polda Metro Jaya, situs TAHU69"),
]

# Situs umum yang dikenal; tidak dibuka. Beberapa sengaja memuat kata yang bisa
# disangka judi ("bola", "slot", "poker", "bandar") sebagai uji false positive.
COMMON_NORMAL = [
    ("https://www.google.com", ""), ("https://www.youtube.com", ""),
    ("https://github.com", ""), ("https://www.shopee.co.id", ""),
    ("https://www.gojek.com", ""), ("https://bri.co.id", ""),
    ("https://www.bni.co.id", ""), ("https://www.tiket.com", ""),
    ("https://www.blibli.com", ""), ("https://www.kemenkeu.go.id", ""),
    ("https://www.bi.go.id", ""), ("https://www.ojk.go.id", ""),
    ("https://www.komdigi.go.id", ""), ("https://www.itb.ac.id", ""),
    ("https://ugm.ac.id", ""), ("https://unair.ac.id", ""),
    ("https://www.liputan6.com", ""), ("https://www.tempo.co", ""),
    ("https://www.antaranews.com", ""), ("https://www.bolasport.com", "berita olahraga"),
    ("https://www.goal.com/id", "berita sepak bola"),
    ("https://en.wikipedia.org/wiki/Slot_machine", "artikel informatif, kata 'slot'"),
    ("https://id.wikipedia.org/wiki/Poker", "artikel informatif, kata 'poker'"),
    ("https://id.wikipedia.org/wiki/Bandar_Lampung", "nama kota, kata 'bandar'"),
    ("https://www.bandung.go.id", "situs pemerintah daerah"),
]


def main() -> int:
    manifest_path = ROOT / "manifest.json"
    if not manifest_path.exists():
        print(f"Tidak ada {manifest_path}. Kumpulkan contoh dulu.")
        return 2
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    rows, seen = [], set()

    def add(url, label, sumber, catatan):
        if url in seen:
            return
        seen.add(url)
        rows.append(dict(url=url, label=label, sumber=sumber, catatan=catatan,
                         url_menunjukkan_judi="ya" if url_shows_gambling(url) else "tidak"))

    for m in manifest:
        add(m["url"], m["label"], "halaman_diambil", m["catatan"])
    for url, note in SEARCH_GAMBLING:
        add(url, "judi", "hasil_pencarian", note)
    for url, note in NEWS_GAMBLING:
        add(url, "judi", "berita", note)
    for url, note in COMMON_NORMAL:
        add(url, "normal", "daftar_umum", note)

    out = ROOT / "urls.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["url", "label", "url_menunjukkan_judi",
                                               "sumber", "catatan"])
        writer.writeheader()
        writer.writerows(rows)

    by_label = {}
    for r in rows:
        by_label[r["label"]] = by_label.get(r["label"], 0) + 1
    visible = sum(r["label"] == "judi" and r["url_menunjukkan_judi"] == "ya" for r in rows)
    print(f"{len(rows)} URL ditulis ke {out}: {by_label}")
    print(f"URL judi yang kata judinya terlihat di URL: {visible}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
