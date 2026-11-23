"""Membuka link yang dilaporkan supaya isinya bisa dinilai pipeline DET-01..05.

Dipakai POST /scan di detection_engine/api/main.py (form analisis masyarakat).

Modul:
    safety    cek URL dan alamat tujuan (pencegahan SSRF)
    classify  golongkan halaman blokir, Cloudflare, dan error HTTP
    fetcher   buka halaman dengan Playwright (Chromium headless)

Worker antrean dan monitoring scraping (docs/RANCANGAN_SCRAPER.md) belum termasuk di sini.
"""
