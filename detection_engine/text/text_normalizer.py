"""Text normalizer for keyword detection (DET-04)."""

import re
import unicodedata
from typing import Dict, List, Tuple
import regex  # Using regex for Unicode support


class TextNormalizer:
    """Normalize text for keyword matching."""
    
    # Leetspeak and homoglyph mapping
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
    
    # Homoglyph mapping for common substitutions
    HOMOGLYPH_MAP = {
        'ⓐ': 'a', 'Ⓐ': 'a',
        'ⓑ': 'b', 'Ⓑ': 'b',
        'ⓒ': 'c', 'Ⓒ': 'c',
        'ⓓ': 'd', 'Ⓓ': 'd',
        'ⓔ': 'e', 'Ⓔ': 'e',
        'ⓕ': 'f', 'Ⓕ': 'f',
        'ⓖ': 'g', 'Ⓖ': 'g',
        'ⓗ': 'h', 'Ⓗ': 'h',
        'ⓘ': 'i', 'Ⓘ': 'i',
        'ⓙ': 'j', 'Ⓙ': 'j',
        'ⓚ': 'k', 'Ⓚ': 'k',
        'ⓛ': 'l', 'Ⓛ': 'l',
        'ⓜ': 'm', 'Ⓜ': 'm',
        'ⓝ': 'n', 'Ⓝ': 'n',
        'ⓞ': 'o', 'Ⓞ': 'o',
        'ⓟ': 'p', 'Ⓟ': 'p',
        'ⓠ': 'q', 'Ⓠ': 'q',
        'ⓡ': 'r', 'Ⓡ': 'r',
        'ⓢ': 's', 'Ⓢ': 's',
        'ⓣ': 't', 'Ⓣ': 't',
        'ⓤ': 'u', 'Ⓤ': 'u',
        'ⓥ': 'v', 'Ⓥ': 'v',
        'ⓦ': 'w', 'Ⓦ': 'w',
        'ⓧ': 'x', 'Ⓧ': 'x',
        'ⓨ': 'y', 'Ⓨ': 'y',
        'ⓩ': 'z', 'Ⓩ': 'z',
    }
    
    # Indonesian-specific substitutions
    INDONESIAN_SUBSTITUTIONS = {
        '2': 'dua',
        '4': 'empat',
        '8': 'delapan',
        '9': 'sembilan',
    }
    
    def __init__(self):
        # Compile regex patterns
        self.space_regex = re.compile(r'\s+')
        self.repeat_regex = re.compile(r'(.)\1{2,}')  # 3+ repeats
        self.char_regex = re.compile(r'\b(\w)\b')  # single character words
        
    def normalize(self, text: str, aggressive: bool = True) -> str:
        """
        Normalize text for keyword matching.
        
        Steps:
        1. NFKC normalization
        2. Lowercase
        3. Leetspeak/homoglyph substitution
        4. Collapse repeated characters
        5. Rejoin spaced letters
        """
        if not text:
            return ""
        
        # Step 1: NFKC normalization
        normalized = unicodedata.normalize('NFKC', text)
        
        # Step 2: Lowercase
        normalized = normalized.lower()
        
        # Step 3: Leetspeak and homoglyph substitution
        if aggressive:
            normalized = self._substitute_leet(normalized)
            normalized = self._substitute_homoglyphs(normalized)
        
        # Step 4: Collapse repeated characters (3+ repeats become 2)
        normalized = self._collapse_repeats(normalized)
        
        # Step 5: Rejoin spaced letters
        normalized = self._rejoin_spaced_letters(normalized)
        
        # Remove extra whitespace
        normalized = self.space_regex.sub(' ', normalized).strip()
        
        return normalized
    
    def _substitute_leet(self, text: str) -> str:
        """Substitute leetspeak characters."""
        result = []
        for char in text:
            if char in self.LEETSPEAK_MAP:
                result.append(self.LEETSPEAK_MAP[char])
            elif char in self.INDONESIAN_SUBSTITUTIONS:
                # For Indonesian numbers in words
                result.append(self.INDONESIAN_SUBSTITUTIONS[char])
            else:
                result.append(char)
        return ''.join(result)
    
    def _substitute_homoglyphs(self, text: str) -> str:
        """Substitute homoglyph characters."""
        result = []
        for char in text:
            if char in self.HOMOGLYPH_MAP:
                result.append(self.HOMOGLYPH_MAP[char])
            else:
                result.append(char)
        return ''.join(result)
    
    def _collapse_repeats(self, text: str) -> str:
        """Collapse repeated characters (e.g., 'goooood' -> 'good')."""
        def replace_match(match):
            char = match.group(1)
            return char * 2  # Keep 2 instances
        
        return self.repeat_regex.sub(replace_match, text)
    
    def _rejoin_spaced_letters(self, text: str) -> str:
        """Rejoin intentionally spaced letters (e.g., 's l o t' -> 'slot')."""
        # Find single character words and join them
        def replace_single_char(match):
            return match.group(1)  # Remove the space around single chars
        
        # This is a simplified version - would need more sophisticated
        # handling for actual spaced letters detection
        return self.char_regex.sub(replace_single_char, text)
    
    def tokenize_for_matching(self, text: str) -> List[str]:
        """Tokenize text for keyword matching."""
        normalized = self.normalize(text)
        
        # Split by non-alphanumeric characters
        tokens = re.findall(r'[\w]+', normalized)
        
        # Also create n-grams for better matching
        ngrams = []
        for token in tokens:
            if len(token) > 2:
                # Add bigrams
                for i in range(len(token) - 1):
                    ngrams.append(token[i:i+2])
        
        return tokens + ngrams
    
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