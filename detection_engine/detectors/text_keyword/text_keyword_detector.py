"""DET-04: Text/Keyword Detection with normalization and fuzzy matching."""

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
            # Normalize text
            normalized_text = self.normalizer.normalize(text)
            
            # Get keywords for the specified language
            keywords = self._get_keywords(language)
            
            # Find matches
            matches = self._find_matches(normalized_text, keywords, timeout)
            
            # Calculate score
            score = self._calculate_score(matches)
            
            # Create evidence
            evidence = self._create_evidence(matches, normalized_text)
            
            # Determine label
            label = "Keywords Found" if matches else "No Keywords"
            
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
        """Get keywords for language, caching them."""
        if self._keywords is None:
            self._keywords = self.keyword_provider.get_active_keywords_by_language(language)
            self._keyword_terms = [k.term for k in self._keywords]
        
        return self._keywords
    
    def _find_matches(self, text: str, keywords: List[GamblingKeyword], 
                      timeout: float) -> List[Dict[str, Any]]:
        """Find keyword matches using exact and fuzzy matching."""
        matches = []
        
        # Exact matching first
        for keyword in keywords:
            if keyword.term.lower() in text.lower():
                matches.append({
                    'keyword': keyword,
                    'match_type': 'exact',
                    'confidence': 1.0,
                    'positions': self._find_all_positions(text, keyword.term),
                })
        
        # Fuzzy matching for longer text
        if len(text) > 50 and self.fuzzy_threshold > 0:
            fuzzy_matches = self._fuzzy_match(text, keywords, timeout)
            matches.extend(fuzzy_matches)
        
        return matches
    
    def _find_all_positions(self, text: str, term: str) -> List[int]:
        """Find all positions of term in text."""
        positions = []
        text_lower = text.lower()
        term_lower = term.lower()
        pos = text_lower.find(term_lower)
        
        while pos != -1:
            positions.append(pos)
            pos = text_lower.find(term_lower, pos + 1)
        
        return positions
    
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
        
        total_score = 0.0
        for match in matches:
            keyword = match['keyword']
            confidence = match['confidence']
            
            # Weighted by keyword weight and match confidence
            match_score = keyword.weight * confidence
            
            # Exact matches get bonus
            if match['match_type'] == 'exact':
                match_score *= 1.2
            
            total_score += match_score
        
        # Normalize to 0..1 using sigmoid-like function
        normalized = min(1.0, total_score / 5.0)  # Adjust denominator as needed
        return normalized
    
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