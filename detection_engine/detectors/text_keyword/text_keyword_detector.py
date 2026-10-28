"""DET-04: Text/Keyword Detection with normalization and fuzzy matching."""

import re
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from rapidfuzz import fuzz, process

from detection_engine.models.detection_models import (
    DetectionStatus, DetectorType, DetectionResult, DetectorError
)
from detection_engine.text.text_normalizer import TextNormalizer
from detection_engine.providers.keyword_provider import KeywordProvider, GamblingKeyword


class TextKeywordDetector:
    """DET-04: Text/Keyword detector."""
    
    def __init__(self, 
                 keyword_provider: Optional[KeywordProvider] = None,
                 normalizer: Optional[TextNormalizer] = None,
                 min_score: float = 0.3,
                 fuzzy_threshold: int = 85):
        self.keyword_provider = keyword_provider or KeywordProvider()
        self.normalizer = normalizer or TextNormalizer()
        self.min_score = min_score
        self.fuzzy_threshold = fuzzy_threshold
        self.logger = logging.getLogger(__name__)
        
        # Pre-load keywords
        self._keywords: Optional[List[GamblingKeyword]] = None
        self._keyword_terms: Optional[List[str]] = None
    
    def detect(self, text: str, language: str = "id", timeout: float = 2.0) -> DetectionResult:
        """
        Detect gambling keywords in text.
        
        Returns DetectionResult with:
        - label: "Keywords Found" or "No Keywords"
        - score: weighted sum squashed to 0..1
        - evidence: list of keywords with category, count, and snippet
        """
        start_time = time.time()
        
        # Check if text is provided
        if not text or not text.strip():
            return self._create_skipped_result("No text provided", start_time)
        
        try:
            # Normalize text (more than one reading when a digit is ambiguous)
            variants = self.normalizer.normalize_variants(text)
            normalized_text = variants[0]

            # Get keywords for the specified language
            keywords = self._get_keywords(language)

            # Find matches in every variant; keep one match per keyword
            matches_by_term: Dict[str, Dict[str, Any]] = {}
            for variant in variants:
                for match in self._find_matches(variant, keywords, timeout):
                    term = match['keyword'].term
                    best = matches_by_term.get(term)
                    if best is None or match['confidence'] > best['confidence']:
                        matches_by_term[term] = match
            matches = list(matches_by_term.values())
            
            # Calculate score
            score = self._calculate_score(matches)
            
            # Create evidence
            evidence = self._create_evidence(matches, normalized_text)
            
            # Determine label
            # Weak, ambiguous hits (e.g. a lone "bola") stay below min_score
            # and are reported as "No Keywords"; they remain in the evidence.
            label = "Keywords Found" if matches and score >= self.min_score else "No Keywords"
            
            return DetectionResult(
                detector=DetectorType.TEXT_KEYWORD,
                status=DetectionStatus.OK,
                label=label,
                score=score,
                evidence=evidence,
                duration_ms=int((time.time() - start_time) * 1000),
            )
            
        except Exception as e:
            self.logger.error(f"Error in text keyword detection: {e}")
            return self._create_error_result(str(e), start_time)
    
    def _get_keywords(self, language: str) -> List[GamblingKeyword]:
        """Get all active keywords.

        Gambling pages mix Indonesian and English ("slot gacor", "free spin"),
        so every active keyword is used regardless of `language`. Caching is
        left to the provider, which refreshes from Firestore every
        `cache_ttl_minutes` (15 by default, per the PRD).
        """
        by_term: Dict[str, GamblingKeyword] = {}
        for keyword in self.keyword_provider.get_keywords():
            if not keyword.active:
                continue
            # "slot" or "poker" can be listed once per language; count once
            key = keyword.term.lower()
            if key not in by_term or keyword.weight > by_term[key].weight:
                by_term[key] = keyword
        return list(by_term.values())
    
    def _find_matches(self, text: str, keywords: List[GamblingKeyword], 
                      timeout: float) -> List[Dict[str, Any]]:
        """Find keyword matches using exact and fuzzy matching."""
        matches = []
        text = text.lower()
        exact_terms = set()

        # Exact matching first
        for keyword in keywords:
            positions = self._find_all_positions(text, keyword.term)
            if positions:
                exact_terms.add(keyword.term)
                matches.append({
                    'keyword': keyword,
                    'match_type': 'exact',
                    'confidence': 1.0,
                    'positions': positions,
                })

        # Fuzzy matching (typos) for longer text, only for keywords that did
        # not already match exactly so nothing is counted twice
        if len(text) > 50 and self.fuzzy_threshold > 0:
            candidates = [
                k for k in keywords
                if k.term not in exact_terms and len(k.term) >= self.MIN_FUZZY_LENGTH
            ]
            matches.extend(self._fuzzy_match(text, candidates, timeout))

        return matches

    # Terms this short or shorter must match as whole words ("bet" must not
    # match "alphabet"); longer terms may appear inside compound words
    # ("togelonline", "slotgacor").
    WHOLE_WORD_MAX_LENGTH = 4
    # Shorter terms produce too many false fuzzy matches
    MIN_FUZZY_LENGTH = 6

    def _term_pattern(self, term: str) -> "re.Pattern[str]":
        """Compile (and cache) the regex used to find a term."""
        cache = self.__dict__.setdefault('_pattern_cache', {})
        pattern = cache.get(term)
        if pattern is None:
            body = re.escape(term.lower())
            if len(term) <= self.WHOLE_WORD_MAX_LENGTH:
                body = rf'(?<![a-z]){body}(?![a-z])'
            pattern = cache[term] = re.compile(body)
        return pattern

    def _find_all_positions(self, text: str, term: str) -> List[int]:
        """Find all positions of term in (already lowercase) text."""
        return [m.start() for m in self._term_pattern(term).finditer(text)]
    
    def _fuzzy_match(self, text: str, keywords: List[GamblingKeyword], 
                     timeout: float) -> List[Dict[str, Any]]:
        """Perform fuzzy matching using rapidfuzz."""
        matches = []
        keyword_terms = [k.term for k in keywords]
        
        try:
            # Use process.extract with timeout
            results = process.extract(
                text,
                keyword_terms,
                scorer=fuzz.partial_ratio,
                score_cutoff=self.fuzzy_threshold,
                limit=20
            )
            
            for term, score, _ in results:
                # Find the corresponding keyword object
                keyword = next((k for k in keywords if k.term == term), None)
                if keyword:
                    matches.append({
                        'keyword': keyword,
                        'match_type': 'fuzzy',
                        'confidence': score / 100.0,
                        'positions': [],  # Fuzzy matches don't have exact positions
                    })
                    
        except Exception as e:
            self.logger.warning(f"Fuzzy matching failed: {e}")
        
        return matches
    
    def _calculate_score(self, matches: List[Dict[str, Any]]) -> float:
        """Calculate weighted score from matches."""
        if not matches:
            return 0.0

        # Noisy-OR over distinct keywords: each keyword is independent
        # evidence, so one strong keyword ("judi") is enough on its own and
        # more keywords push the score toward 1.0 without exceeding it.
        remaining = 1.0
        for match in matches:
            keyword = match['keyword']

            # Exact matches count fully, fuzzy ones are discounted
            strength = 0.9 if match['match_type'] == 'exact' else 0.8
            p = min(0.95, keyword.weight * match['confidence'] * strength)

            # Repeated occurrences add a little extra evidence (capped)
            occurrences = min(len(match['positions']), 5)
            if occurrences > 1:
                p = 1.0 - (1.0 - p) ** (1.0 + 0.25 * (occurrences - 1))

            remaining *= 1.0 - min(p, 0.99)

        return 1.0 - remaining
    
    def _create_evidence(self, matches: List[Dict[str, Any]], text: str) -> Dict[str, Any]:
        """Create evidence dictionary."""
        evidence = {
            'matches_found': len(matches),
            'keywords_found': [],
            'text_preview': text[:200] + "..." if len(text) > 200 else text,
        }
        
        # Group matches by keyword
        keyword_counts = {}
        for match in matches:
            keyword = match['keyword']
            key = (keyword.term, keyword.category)
            if key not in keyword_counts:
                keyword_counts[key] = {
                    'keyword': keyword.term,
                    'category': keyword.category,
                    'weight': keyword.weight,
                    'language': keyword.language,
                    'count': 0,
                    'match_types': set(),
                    'snippets': [],
                }
            
            entry = keyword_counts[key]
            entry['count'] += 1
            entry['match_types'].add(match['match_type'])
            
            # Add snippet for exact matches with context
            if match['match_type'] == 'exact' and match['positions']:
                pos = match['positions'][0]
                snippet_start = max(0, pos - 20)
                snippet_end = min(len(text), pos + len(keyword.term) + 20)
                snippet = text[snippet_start:snippet_end]
                if snippet_start > 0:
                    snippet = "..." + snippet
                if snippet_end < len(text):
                    snippet = snippet + "..."
                entry['snippets'].append(snippet)
        
        # Convert to list format
        for key, data in keyword_counts.items():
            evidence['keywords_found'].append({
                'keyword': data['keyword'],
                'category': data['category'],
                'weight': data['weight'],
                'language': data['language'],
                'count': data['count'],
                'match_types': list(data['match_types']),
                'snippets': data['snippets'][:3],  # Limit snippets
            })
        
        return evidence
    
    def _create_skipped_result(self, reason: str, start_time: float) -> DetectionResult:
        """Create skipped result."""
        return DetectionResult(
            detector=DetectorType.TEXT_KEYWORD,
            status=DetectionStatus.SKIPPED,
            label="Skipped",
            score=0.0,
            evidence={'reason': reason},
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def _create_error_result(self, error_message: str, start_time: float) -> DetectionResult:
        """Create error result."""
        return DetectionResult(
            detector=DetectorType.TEXT_KEYWORD,
            status=DetectionStatus.FAILED,
            label="Error",
            score=0.0,
            error=DetectorError(
                code="TEXT_KEYWORD_ERROR",
                message_id="text_keyword_detection_failed",
                details={'error': error_message}
            ),
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def batch_detect(self, texts: List[str], language: str = "id", 
                     max_workers: int = 4) -> List[DetectionResult]:
        """Detect keywords in multiple texts concurrently."""
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self.detect, text, language): i
                for i, text in enumerate(texts)
            }
            
            results = [None] * len(texts)
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    results[idx] = future.result(timeout=5.0)
                except Exception as e:
                    self.logger.error(f"Batch detection failed for text {idx}: {e}")
                    results[idx] = self._create_error_result(str(e), time.time())
            
            return results


# Default detector instance
default_text_keyword_detector = TextKeywordDetector()