"""Pola nama merek situs judi Indonesia: kata dasar + angka.

Dipakai DET-01 (nama domain) dan DET-04 (teks halaman/komentar), supaya
"zeus123", "hoki138", "mpo88", "petir388" dikenali di link maupun di kalimat.

Sumber: nama domain di daftar situs populer Tranco (1 juta domain) dan log
Certificate Transparency (crt.sh), dianalisis 11/11/2026. Situs judi Indonesia
hampir selalu dinamai <kata><angka>, dengan angka dari kelompok yang sama.
"""

import re

# Kata dasar yang di data hampir selalu dipakai untuk merek judi bila diikuti angka
# apa pun (zeus8, zeus123, mpo500). Kata yang juga umum di situs biasa (usa, web,
# news, server, star, win, top, king, royal, mega, lucky) tidak dimasukkan di sini;
# merek seperti king138 atau royal188 tetap tertangkap lewat WORD_GAMBLING_NUMBER.
BRAND_STEMS = (
    # permintaan pengguna dan judul game slot
    'zeus', 'kakekzeus', 'olympus', 'gatotkaca', 'mahjong', 'scatter', 'pragmatic',
    # merek yang berulang di data Tranco/crt.sh
    # Tidak dimasukkan: "dewa" (band Dewa 19), "dewi" (nama orang), "ufa" (kota di Rusia).
    # Merek seperti dewa138 tetap tertangkap lewat WORD_GAMBLING_NUMBER.
    'mpo', 'hoki', 'hokky', 'naga', 'garuda', 'petir', 'raja', 'sultan',
    'badak', 'luxury', 'vegas', 'lord', 'jili', 'joker', 'cuan', 'jackpot',
    'gacor', 'maxwin', 'slot', 'slots', 'toto', 'togel', 'judi', 'kasino', 'casino',
    'poker', 'sbobet', 'bandar', 'jitu', 'tajir',
)

# Angka yang hampir hanya dipakai merek judi
# ("5000" tidak dimasukkan: di teks bisa harga, mis. "idr5000")
GAMBLING_NUMBERS = ('138', '168', '188', '288', '303', '388', '338', '368', '4d')
# Angka keberuntungan yang juga dipakai situs biasa (usa88, dns88, web777)
LUCKY_NUMBERS = ('88', '77', '777', '888', '99', '999', '69', '365')

_stems = '|'.join(sorted(BRAND_STEMS, key=len, reverse=True))
# Kata dasar 3 huruf ("mpo") hanya dihitung di awal kata: "tempo24" bukan "mpo24"
_long_stems = '|'.join(sorted((s for s in BRAND_STEMS if len(s) > 3), key=len, reverse=True))
_short_stems = '|'.join(sorted((s for s in BRAND_STEMS if len(s) <= 3), key=len, reverse=True))
# Dua digit atau lebih; satu digit hanya bila tidak langsung diikuti huruf
# ("zeus8.com" ya, "mahjong4friends" tidak)
_number = r'(?:\d{2,4}(?![0-9])|\d(?![0-9a-z]))'
_gambling_numbers = '|'.join(sorted(GAMBLING_NUMBERS, key=len, reverse=True))
_lucky_numbers = '|'.join(sorted(LUCKY_NUMBERS, key=len, reverse=True))

# kata dasar + angka apa pun: zeus8, zeus123, hoki138, mpo500.
# Di teks: kata utuh, boleh "zeus 123". Di domain kata sering digabung
# ("slotgacor88", "situszeus123"), jadi batas kiri tidak diwajibkan.
# Di teks, "2" tunggal adalah bentuk ulang ("raja2" = "raja-raja"), bukan nomor merek
_number_text = r'(?:\d{2,4}(?![0-9])|[013-9](?![0-9a-z]))'
STEM_NUMBER = re.compile(rf'(?<![a-z])(?:{_stems})[\-_]?{_number_text}')
# Di teks, spasi ("zeus 123") hanya untuk kata yang jelas judi: "Joker 2" (film)
# atau "Garuda 2026" tidak boleh ikut.
_spaced_stems = '|'.join(sorted((
    'zeus', 'kakekzeus', 'olympus', 'mpo', 'hoki', 'gacor', 'maxwin', 'slot', 'slots',
    'toto', 'togel', 'judi', 'kasino', 'casino', 'sbobet', 'scatter'), key=len, reverse=True))
STEM_NUMBER_SPACED = re.compile(rf'(?<![a-z])(?:{_spaced_stems}) {_number_text}')
STEM_NUMBER_GLUED = re.compile(
    rf'(?:(?:{_long_stems})|(?<![a-z])(?:{_short_stems}))-?{_number}')
# kata apa pun + angka khas judi: lotus303, agen138, petir388 (tanpa spasi)
WORD_GAMBLING_NUMBER = re.compile(rf'(?<![a-z])[a-z]{{3,12}}(?:{_gambling_numbers})(?![0-9])')
# kata apa pun + angka keberuntungan: hanya pendukung
WORD_LUCKY_NUMBER = re.compile(rf'(?<![a-z])[a-z]{{3,12}}(?:{_lucky_numbers})(?![0-9])')

# TLD murah yang banyak dipakai situs judi sekali pakai. Hanya pendukung:
# banyak situs biasa juga memakainya.
CHEAP_TLDS = (
    '.xyz', '.top', '.site', '.online', '.icu', '.club', '.fun', '.live', '.shop', '.store',
    '.lol', '.bond', '.cfd', '.sbs', '.autos', '.baby', '.buzz', '.click', '.space',
    '.website', '.cyou', '.monster', '.quest', '.rest', '.beauty', '.hair', '.skin',
    '.makeup', '.boats', '.homes', '.motorcycles', '.yachts', '.mom', '.pics', '.social',
    '.pro', '.biz', '.info', '.cc', '.asia', '.ink', '.today', '.world', '.life', '.best',
)
