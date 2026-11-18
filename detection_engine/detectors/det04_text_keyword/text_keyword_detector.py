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
from detection_engine.detectors.det04_text_keyword.text_normalizer import TextNormalizer
from detection_engine.detectors.det04_text_keyword.keyword_provider import KeywordProvider, GamblingKeyword
from detection_engine.config.gambling_brands import (
    STEM_NUMBER, STEM_NUMBER_SPACED, WORD_GAMBLING_NUMBER,
)


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
            
            # Calculate score, then damp it when the page only talks about
            # gambling (news, education) or mentions it in passing
            score = self._calculate_score(matches)
            score, context = self._apply_context(score, matches, normalized_text)

            # Create evidence
            evidence = self._create_evidence(matches, normalized_text)
            evidence.update(context)
            
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
        left to the provider, which refreshes from Supabase every
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
            # Other spellings ("alexis 17", "jodol") count as the keyword itself
            spellings = {keyword.term, *(keyword.variations or []), *(keyword.aliases or [])}
            positions = sorted({p for spelling in spellings if spelling.strip()
                                for p in self._find_all_positions(text, spelling)})
            if positions:
                exact_terms.add(keyword.term)
                matches.append({
                    'keyword': keyword,
                    'match_type': 'exact',
                    'confidence': 1.0,
                    'positions': positions,
                })

        # Brand names <word><number> ("zeus123", "hoki138", "slot 88"): too many to
        # list as keywords, so they are matched by pattern (shared with DET-01).
        brands: Dict[str, Tuple[float, List[int]]] = {}
        for pattern, weight in self.BRAND_PATTERNS:
            for found in pattern.finditer(text):
                term = found.group()
                if term in exact_terms:
                    continue
                best, positions = brands.get(term, (0.0, []))
                brands[term] = (max(best, weight), positions + [found.start()])
        for term, (weight, positions) in brands.items():
            exact_terms.add(term)
            matches.append({
                'keyword': GamblingKeyword(term=term, category='brand', weight=weight,
                                           active=True, language='id'),
                'match_type': 'exact',
                'confidence': 1.0,
                'positions': sorted(set(positions)),
            })

        # Fuzzy matching (typos) for longer text, only for keywords that did
        # not already match exactly so nothing is counted twice
        if len(text) > 50 and self.fuzzy_threshold > 0:
            candidates = [
                k for k in keywords
                if k.term not in exact_terms and len(k.term) >= self.MIN_FUZZY_LENGTH
            ]
            # A word that is itself a keyword ("bandar") is not a typo of a
            # longer one ("bandarq"); it is matched, or not, on its own.
            known = {k.term.lower() for k in keywords}
            matches.extend(self._fuzzy_match(text, candidates, timeout, exclude=known))

        return matches

    # Brand-name patterns and their weight (both anchor: >= ANCHOR_WEIGHT)
    BRAND_PATTERNS = (
        (STEM_NUMBER, 0.7),            # zeus123, hoki138, mpo500
        (STEM_NUMBER_SPACED, 0.7),     # "zeus 123", "slot 88"
        (WORD_GAMBLING_NUMBER, 0.6),   # petir388, naga303 (glued only: not "pasal 303")
    )

    # Terms this short or shorter must match as whole words ("bet" must not
    # match "alphabet"); longer terms may appear inside compound words
    # ("togelonline", "slotgacor").
    WHOLE_WORD_MAX_LENGTH = 4
    # Shorter terms produce too many false fuzzy matches: every 6-letter
    # keyword has everyday words one letter away ("sabung" ~ "sabun",
    # "sambung"; "kasino" ~ "kasih"). Disguised short keywords are still
    # caught exactly after leetspeak normalisation ("k4sino" -> "kasino").
    MIN_FUZZY_LENGTH = 7
    # Keywords at or above this weight get the repetition bonus
    STRONG_KEYWORD_WEIGHT = 0.6

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
                     timeout: float, exclude: Optional[set] = None) -> List[Dict[str, Any]]:
        """Catch typos of single-word keywords by comparing whole words.

        Words are compared with the keyword, and only words within one letter
        of its length are considered. Sliding a window over the raw text
        instead (partial_ratio) also matches fragments of related words:
        "dipertaruhkan" ("at stake") contains "taruhka", which scores the same
        as a real one-letter typo of "taruhan". Whole-word comparison tells
        them apart: "taruhn" and "tarruhan" match, "dipertaruhkan" cannot.
        Multi-word keywords are not fuzzy-matched.

        The candidate word must also start with the keyword's first letter.
        Disguised keywords keep their first letter ("taruhn", "jackpott"),
        while ordinary words one letter away usually differ right there:
        "setting" and "getting" are not typos of "betting".
        """
        matches = []
        by_length: Dict[int, List[str]] = {}
        for word in set(re.findall(r'[a-z]{4,}', text)) - (exclude or set()):
            by_length.setdefault(len(word), []).append(word)

        try:
            for keyword in keywords:
                term = keyword.term.lower()
                if ' ' in term:
                    continue
                candidates = [w for n in (len(term) - 1, len(term), len(term) + 1)
                              for w in by_length.get(n, ()) if w[0] == term[0]]
                if not candidates:
                    continue
                best = process.extractOne(term, candidates, scorer=fuzz.ratio,
                                          score_cutoff=self.fuzzy_threshold)
                if best:
                    matches.append({
                        'keyword': keyword,
                        'match_type': 'fuzzy',
                        'confidence': best[1] / 100.0,
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

            # Repeated occurrences add a little extra evidence (capped), but
            # only for strong keywords: an ambiguous word such as "bola"
            # repeated on a football site is not evidence of gambling
            occurrences = min(len(match['positions']), 5)
            if occurrences > 1 and keyword.weight >= self.STRONG_KEYWORD_WEIGHT:
                p = 1.0 - (1.0 - p) ** (1.0 + 0.25 * (occurrences - 1))

            remaining *= 1.0 - min(p, 0.99)

        return 1.0 - remaining
    
    # --- Context: does the page *sell* gambling, or only *talk about* it? ---
    #
    # A gambling site is full of promotional wording; a news article or an
    # awareness page repeats "judi" but uses reporting/enforcement wording.
    # Both lists are plain phrases matched as whole words in the normalized
    # text. Generic words that also occur on ordinary sites ("terpercaya",
    # "deposit") are deliberately left out of the promotional list.
    PROMO_CUES = (
        'gacor', 'maxwin', 'jackpot', 'bonus new member', 'bonus member', 'member baru',
        'freebet', 'free spin', 'scatter', 'link alternatif', 'rtp live', 'rtp slot',
        'daftar sekarang', 'situs resmi', 'gampang menang', 'anti rungkad', 'pola gacor',
        'tanpa potongan', 'deposit pulsa', 'bocoran', 'welcome bonus',
        'scatter hitam', 'jam gacor', 'pola slot', 'rtp gacor', 'modal receh', 'depo receh',
        'auto wd', 'wd lancar', 'gampang maxwin', 'bonus rollingan', 'slot thailand',
        'server thailand', 'akun pro', 'situs gacor', 'link gacor', 'slot dana', 'depo dana',
    )
    INFO_CUES = (
        'diblokir', 'pemblokiran', 'memblokir', 'blokir', 'polisi', 'polri', 'bareskrim',
        'tersangka', 'ditangkap', 'penegak hukum', 'komdigi', 'kominfo', 'ojk', 'ppatk',
        'edukasi', 'sosialisasi', 'literasi', 'imbauan', 'himbauan', 'waspada', 'bahaya',
        'dampak', 'kecanduan', 'korban', 'pidana', 'undang-undang', 'uu ite', 'hukuman',
        'penelitian', 'pemerintah', 'kementerian', 'menteri', 'presiden', 'dpr', 'pasal',
        'penyidikan',
    )  # "rekening" is left out: gambling pages talk about bank accounts too
    # Damping factors. Both keep even a near-perfect keyword score (< 1.0)
    # below the "Keywords Found" threshold (min_score = 0.3): 0.25 * 1.0 and
    # 0.3 * 0.99 are both under 0.3, so a damped page is never labelled found.
    INFORMATIONAL_FACTOR = 0.25
    INCIDENTAL_FACTOR = 0.3
    # A page needs at least one keyword this heavy to be flagged; otherwise the
    # score is capped under min_score (0.3).
    ANCHOR_WEIGHT = 0.5
    WEAK_ONLY_CAP = 0.29
    # A page longer than this with at most INCIDENTAL_MAX_HITS hits is a
    # passing mention, not a gambling page.
    LONG_TEXT_CHARS = 3000
    INCIDENTAL_MAX_HITS = 2

    def _cues_in(self, cues, text: str) -> List[str]:
        cache = self.__dict__.setdefault('_cue_cache', {})
        found = []
        for cue in cues:
            pattern = cache.get(cue)
            if pattern is None:
                pattern = cache[cue] = re.compile(rf'(?<![a-z]){re.escape(cue)}(?![a-z])')
            if pattern.search(text):
                found.append(cue)
        return found

    def _apply_context(self, score: float, matches: List[Dict[str, Any]],
                       text: str) -> Tuple[float, Dict[str, Any]]:
        """Damp the score for informational or incidental mentions.

        Returns the new score and extra evidence ('context' plus the cues).
        """
        if not matches:
            return score, {}
        lowered = text.lower()
        promo = self._cues_in(self.PROMO_CUES, lowered)
        info = self._cues_in(self.INFO_CUES, lowered)
        hits = sum(max(len(m['positions']), 1) for m in matches)
        details = {'promo_cues': promo, 'info_cues': info, 'keyword_hits': hits}

        # Ambiguous words ("bola", "gacor", "bandar", ...) are everyday
        # vocabulary; any number of them together is still not a gambling page.
        if max(m['keyword'].weight for m in matches) < self.ANCHOR_WEIGHT:
            return min(score, self.WEAK_ONLY_CAP), {**details, 'context': 'weak'}

        if len(info) >= 3 and len(promo) <= 1:
            return score * self.INFORMATIONAL_FACTOR, {**details, 'context': 'informational'}
        if len(lowered) > self.LONG_TEXT_CHARS and hits <= self.INCIDENTAL_MAX_HITS:
            return score * self.INCIDENTAL_FACTOR, {**details, 'context': 'incidental'}
        return score, {**details, 'context': 'promotional' if len(promo) >= 2 else 'neutral'}

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

        evidence['passages'] = self._passages(matches, text)
        return evidence

    # Context kept on each side of a keyword in a passage, and passages kept
    PASSAGE_CONTEXT = 60
    MAX_PASSAGES = 5

    def _passages(self, matches: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
        """Readable excerpts for reviewers: whole words around the keywords found.

        Overlapping windows are merged, so one sentence with "slot gacor maxwin"
        becomes one passage highlighting all three. Positions are looked up again
        in `text`, since a match may have come from another normalised variant.
        """
        windows = []  # (start, end, keyword, spelling)
        for match in matches:
            if match['match_type'] != 'exact':
                continue
            keyword = match['keyword']
            spellings = {keyword.term, *(keyword.variations or []), *(keyword.aliases or [])}
            for spelling in spellings:
                if not spelling.strip():
                    continue
                for pos in self._find_all_positions(text, spelling)[:3]:
                    start = max(0, pos - self.PASSAGE_CONTEXT)
                    end = min(len(text), pos + len(spelling) + self.PASSAGE_CONTEXT)
                    # Widen to whole words
                    while start > 0 and not text[start - 1].isspace():
                        start -= 1
                    while end < len(text) and not text[end].isspace():
                        end += 1
                    windows.append((start, end, keyword, spelling))
        if not windows:
            return []

        windows.sort(key=lambda w: w[0])
        merged = []  # [start, end, {spelling: keyword}]
        for start, end, keyword, spelling in windows:
            if merged and start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], end)
                merged[-1][2][spelling] = keyword
            else:
                merged.append([start, end, {spelling: keyword}])

        passages = []
        for start, end, found in merged:
            heaviest = max(found.values(), key=lambda k: k.weight)
            excerpt = text[start:end].strip()
            passages.append({
                'text': ('...' if start > 0 else '') + excerpt + ('...' if end < len(text) else ''),
                'highlights': sorted(found, key=len, reverse=True),
                'category': heaviest.category,
                'weight': heaviest.weight,
            })
        passages.sort(key=lambda p: p['weight'], reverse=True)
        return passages[:self.MAX_PASSAGES]
    
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