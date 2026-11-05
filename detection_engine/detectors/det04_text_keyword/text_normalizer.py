"""Text normalizer for keyword detection (DET-04)."""

import re
import unicodedata
from typing import Any, Dict, List


class TextNormalizer:
    """Normalize text for keyword matching.

    Gambling pages disguise keywords ("S1ot G4cor", "s l o t", "ⓢⓛⓞⓣ"), so the
    normalizer undoes those tricks. Digits are only treated as look-alike
    letters when they sit inside a word ("s1ot"); standalone numbers and
    trailing numbers ("slot88", "2024") are left alone so brand patterns such
    as slot88 still match.
    """

    # Look-alike characters that stand in for letters
    LEETSPEAK_MAP = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
        '8': 'b',
        '@': 'a',
        '$': 's',
        '!': 'i',
        '|': 'i',
        '†': 't',
    }

    # Circled letters (ⓐ..ⓩ, Ⓐ..Ⓩ) -> plain letters
    HOMOGLYPH_MAP = {
        **{chr(0x24D0 + i): chr(ord('a') + i) for i in range(26)},
        **{chr(0x24B6 + i): chr(ord('a') + i) for i in range(26)},
    }

    _LEET_CHARS = ''.join(re.escape(c) for c in LEETSPEAK_MAP)
    # A leet character with a letter on both sides: "s1ot", "g4cor", "m4xw1n"
    _LEET_IN_WORD = re.compile(rf'(?<=[a-z])[{_LEET_CHARS}](?=[a-z])')
    # A run of 3+ single letters separated by spaces/dots/dashes: "s l o t"
    _SPACED_LETTERS = re.compile(r'(?<![a-z0-9])(?:[a-z][ .\-_]){2,}[a-z](?![a-z0-9])')

    def __init__(self):
        self.space_regex = re.compile(r'\s+')
        self.repeat_regex = re.compile(r'(.)\1{2,}')  # 3+ repeats

    def normalize(self, text: str, aggressive: bool = True, one_as: str = 'i') -> str:
        """
        Normalize text for keyword matching.

        Steps:
        1. NFKC normalization (full-width letters, ligatures, ...)
        2. Lowercase
        3. Homoglyph substitution (circled letters)
        4. Leetspeak substitution inside words only (aggressive mode)
        5. Collapse 3+ repeated characters to 2
        6. Rejoin spaced-out letters ("s l o t" -> "slot")
        """
        if not text:
            return ""

        normalized = unicodedata.normalize('NFKC', text).lower()

        if aggressive:
            normalized = self._substitute_homoglyphs(normalized)
            normalized = self._substitute_leet(normalized, one_as)

        normalized = self._collapse_repeats(normalized)
        normalized = self._rejoin_spaced_letters(normalized)

        return self.space_regex.sub(' ', normalized).strip()

    def normalize_variants(self, text: str) -> List[str]:
        """Return every plausible normalization of `text`.

        '1' is ambiguous: it stands for 'i' in "jud1" but for 'l' in "s1ot".
        The first variant reads it as 'i', the second as 'l'; the second is
        only returned when it actually differs.
        """
        primary = self.normalize(text)
        alternate = self.normalize(text, one_as='l')
        return [primary] if alternate == primary else [primary, alternate]

    def _substitute_leet(self, text: str, one_as: str = 'i') -> str:
        """Replace look-alike characters that sit between two letters."""
        mapping = {**self.LEETSPEAK_MAP, '1': one_as}
        # Two passes so adjacent substitutions ("s1ot" next to "g4cor") and
        # chained ones ("m4xw1n") are all caught.
        for _ in range(2):
            text = self._LEET_IN_WORD.sub(lambda m: mapping[m.group(0)], text)
        return text

    def _substitute_homoglyphs(self, text: str) -> str:
        """Substitute homoglyph characters."""
        return ''.join(self.HOMOGLYPH_MAP.get(c, c) for c in text)

    def _collapse_repeats(self, text: str) -> str:
        """Collapse 3+ repeated characters to 2 ('goooood' -> 'good')."""
        return self.repeat_regex.sub(lambda m: m.group(1) * 2, text)

    def _rejoin_spaced_letters(self, text: str) -> str:
        """Rejoin intentionally spaced letters ('s l o t' -> 'slot')."""
        return self._SPACED_LETTERS.sub(
            lambda m: re.sub(r'[ .\-_]', '', m.group(0)), text
        )

    def tokenize_for_matching(self, text: str) -> List[str]:
        """Tokenize text for keyword matching."""
        normalized = self.normalize(text)
        return re.findall(r'\w+', normalized)

    def get_normalization_stats(self, original: str, normalized: str) -> Dict[str, Any]:
        """Get statistics about normalization."""
        return {
            'original_length': len(original),
            'normalized_length': len(normalized),
            'compression_ratio': len(normalized) / len(original) if original else 0,
            'character_reductions': len(original) - len(normalized),
        }


# Default normalizer instance
default_normalizer = TextNormalizer()
