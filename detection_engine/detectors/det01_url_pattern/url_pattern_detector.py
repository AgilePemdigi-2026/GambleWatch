"""DET-01: URL Pattern Detection with weighted rule engine."""

import re
import time
import logging
import math
from typing import List, Dict, Any, Optional, Pattern, Tuple
from urllib.parse import urlparse, parse_qs

from detection_engine.models.detection_models import (
    DetectionStatus, DetectorType, DetectionResult, DetectorError
)


class URLPatternDetector:
    """DET-01: URL Pattern detector with weighted rule engine."""
    
    # Gambling TLDs
    GAMBLING_TLDS = [
        '.bet', '.casino', '.poker', '.betting', '.games',
        '.win', '.vip', '.lotto', '.bingo', '.poker',
    ]
    
    # Common gambling keywords (from TypeScript code)
    GAMBLING_KEYWORDS_ID = [
        ('judi', 0.9, 'gambling'),
        ('taruhan', 0.8, 'betting'),
        ('togel', 0.9, 'lottery'),
        ('slot', 0.7, 'slot'),
        ('betting', 0.8, 'betting'),
        ('bandar', 0.5, 'agent'),
        ('kasino', 0.9, 'casino'),
        ('poker', 0.7, 'card_game'),
        ('domino', 0.4, 'card_game'),
        ('ceme', 0.8, 'card_game'),
        ('bola', 0.5, 'sports'),
        ('sabung', 0.7, 'sports'),
        ('ayam', 0.3, 'sports'),
        ('maxwin', 0.7, 'promotion'),
        ('gacor', 0.6, 'promotion'),
        ('jackpot', 0.8, 'promotion'),
        ('sbobet', 0.9, 'brand'),
        ('ibcbet', 0.8, 'brand'),
        ('maxbet', 0.8, 'brand'),
        ('ligaciputra', 0.7, 'brand'),
    ]
    
    GAMBLING_KEYWORDS_EN = [
        ('casino', 0.9, 'casino'),
        ('gamble', 0.8, 'gambling'),
        ('bet', 0.7, 'betting'),
        ('poker', 0.7, 'card_game'),
        ('lottery', 0.8, 'lottery'),
        ('roulette', 0.8, 'casino'),
        ('blackjack', 0.7, 'card_game'),
        ('baccarat', 0.7, 'card_game'),
        ('sportsbook', 0.8, 'sports'),
        ('wager', 0.7, 'betting'),
        ('odds', 0.6, 'betting'),
        ('stakes', 0.6, 'betting'),
        ('slot', 0.7, 'slot'),
    ]
    
    # Indonesian gambling patterns
    INDONESIAN_GAMBLING_PATTERNS = [
        (r'\d+bet', 0.8, 'number_brand'),
        (r'\d+togel', 0.8, 'number_brand'),
        (r'\d+judi', 0.8, 'number_brand'),
        (r'\d+slot', 0.7, 'number_slot'),
        (r'slot\d+', 0.7, 'slot_number'),
        (r'gacor\d+', 0.6, 'promotion_number'),
        (r'\d+gacor', 0.6, 'number_promotion'),
        (r'maxwin\d+', 0.7, 'promotion_number'),
        (r'\d+maxwin', 0.7, 'number_promotion'),
    ]
    
    # Suspicious path patterns
    SUSPICIOUS_PATHS = [
        (r'/slot', 0.7, 'slot_path'),
        (r'/daftar', 0.6, 'registration'),
        (r'/login', 0.5, 'login'),
        (r'/register', 0.5, 'registration'),
        (r'/deposit', 0.8, 'payment'),
        (r'/withdraw', 0.8, 'payment'),
        (r'/bonus', 0.6, 'promotion'),
        (r'/promo', 0.6, 'promotion'),
        (r'/rtp', 0.7, 'game_info'),
        (r'/live', 0.6, 'live_casino'),
    ]
    
    def __init__(self, high_risk_threshold: float = 0.6):
        self.high_risk_threshold = high_risk_threshold
        self.logger = logging.getLogger(__name__)
        
        # Compile regex patterns
        self.id_patterns = [
            (re.compile(pattern, re.IGNORECASE), weight, category)
            for pattern, weight, category in self.INDONESIAN_GAMBLING_PATTERNS
        ]
        self.path_patterns = [
            (re.compile(pattern, re.IGNORECASE), weight, category)
            for pattern, weight, category in self.SUSPICIOUS_PATHS
        ]
        
        # Leetspeak mapping
        self.leet_map = {
            '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
            '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
        }
    
    def detect(self, url: str, timeout: float = 1.0) -> DetectionResult:
        """
        Detect gambling patterns in URL.
        
        Returns DetectionResult with:
        - label: "High Risk Pattern" if score >= threshold, else "Normal"
        - score: 0..1
        - evidence: matched rules and details
        """
        start_time = time.time()
        
        # Check if URL is provided
        if not url or not url.strip():
            return self._create_skipped_result("No URL provided", start_time)
        
        try:
            # Parse URL
            parsed = self._parse_url(url)
            if not parsed:
                return self._create_error_result("Invalid URL format", start_time)
            
            # Apply detection rules
            matched_rules = self._apply_rules(parsed)
            
            # Calculate score
            score = self._calculate_score(matched_rules, self._is_trusted_tld(parsed))
            
            # Determine label
            label = "High Risk Pattern" if score >= self.high_risk_threshold else "Normal"
            
            # Create evidence
            evidence = self._create_evidence(matched_rules, parsed, score)
            
            return DetectionResult(
                detector=DetectorType.URL_PATTERN,
                status=DetectionStatus.OK,
                label=label,
                score=score,
                evidence=evidence,
                duration_ms=int((time.time() - start_time) * 1000),
            )
            
        except Exception as e:
            self.logger.error(f"Error in URL pattern detection: {e}")
            return self._create_error_result(str(e), start_time)
    
    def _parse_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Parse URL into components."""
        try:
            parsed = urlparse(url)
            
            # Extract components
            scheme = parsed.scheme.lower()
            netloc = parsed.netloc.lower()
            path = parsed.path.lower()
            query = parsed.query.lower()
            fragment = parsed.fragment.lower()
            
            # Extract domain parts
            domain_parts = netloc.split('.')
            domain = '.'.join(domain_parts[-2:]) if len(domain_parts) >= 2 else netloc
            tld = '.' + domain_parts[-1] if domain_parts else ''
            subdomain = '.'.join(domain_parts[:-2]) if len(domain_parts) > 2 else ''
            
            # Extract path segments
            path_segments = [seg for seg in path.split('/') if seg]
            
            # Parse query parameters
            query_params = parse_qs(query)
            
            # Get full text for pattern matching
            full_text = netloc + path + query + fragment
            
            return {
                'original': url,
                'scheme': scheme,
                'netloc': netloc,
                'domain': domain,
                'tld': tld,
                'subdomain': subdomain,
                'path': path,
                'path_segments': path_segments,
                'query': query,
                'query_params': query_params,
                'fragment': fragment,
                'full_text': full_text,
                'domain_parts': domain_parts,
            }
            
        except Exception:
            return None
    
    def _apply_rules(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply all detection rules."""
        matched_rules = []
        
        # Rule 1: Gambling TLDs
        matched_rules.extend(self._check_tlds(parsed))
        
        # Rule 2: Keywords in domain
        matched_rules.extend(self._check_domain_keywords(parsed))
        
        # Rule 3: Keywords in path/query
        matched_rules.extend(self._check_path_keywords(parsed))
        
        # Rule 4: Indonesian gambling patterns
        matched_rules.extend(self._check_indonesian_patterns(parsed))
        
        # Rule 5: Suspicious path patterns
        matched_rules.extend(self._check_path_patterns(parsed))
        
        # Rule 6: Multiple numbers in domain
        matched_rules.extend(self._check_number_patterns(parsed))
        
        # Rule 7: Subdomain depth and patterns
        matched_rules.extend(self._check_subdomain_patterns(parsed))
        
        # Rule 8: Entropy (random-looking domains)
        matched_rules.extend(self._check_entropy(parsed))
        
        # Rule 9: Hyphen/digit excess
        matched_rules.extend(self._check_hyphen_digit_excess(parsed))
        
        # Rule 10: Punycode/internationalized domains
        matched_rules.extend(self._check_punycode(parsed))
        
        return matched_rules
    
    def _check_tlds(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for gambling TLDs."""
        matched = []
        tld = parsed['tld']
        
        for gambling_tld in self.GAMBLING_TLDS:
            if tld.endswith(gambling_tld):
                matched.append({
                    'rule': 'gambling_tld',
                    'weight': 0.3,
                    'details': f"Gambling TLD detected: {gambling_tld}",
                    'category': 'tld',
                })
                break  # Only count once
        
        return matched
    
    def _check_domain_keywords(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for gambling keywords in domain."""
        matched = []
        domain = parsed['netloc']
        subdomain = parsed['subdomain']
        
        # Check Indonesian keywords
        for keyword, weight, category in self.GAMBLING_KEYWORDS_ID:
            if keyword in domain:
                matched.append({
                    'rule': 'indonesian_keyword_domain',
                    'weight': weight * 0.8,
                    'details': f"Indonesian gambling keyword in domain: '{keyword}'",
                    'category': category,
                })
        
        # Check English keywords (skip ones already counted as Indonesian,
        # e.g. "slot" and "poker" appear in both lists)
        id_keywords = {k for k, _, _ in self.GAMBLING_KEYWORDS_ID}
        for keyword, weight, category in self.GAMBLING_KEYWORDS_EN:
            if keyword in id_keywords:
                continue
            if keyword in domain:
                matched.append({
                    'rule': 'english_keyword_domain',
                    'weight': weight * 0.6,
                    'details': f"English gambling keyword in domain: '{keyword}'",
                    'category': category,
                })
        
        # Check subdomain keywords
        if subdomain:
            seen = set()
            for keyword, weight, category in self.GAMBLING_KEYWORDS_ID + self.GAMBLING_KEYWORDS_EN:
                if keyword in seen:
                    continue
                seen.add(keyword)
                if keyword in subdomain and len(subdomain) > 3:
                    matched.append({
                        'rule': 'keyword_subdomain',
                        'weight': weight * 0.5,
                        'details': f"Gambling keyword in subdomain: '{keyword}'",
                        'category': category,
                    })
        
        return matched
    
    def _check_path_keywords(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for gambling keywords in path and query."""
        matched = []
        path_query = parsed['path'] + parsed['query'] + parsed['fragment']
        
        seen = set()
        for keyword, weight, category in self.GAMBLING_KEYWORDS_ID + self.GAMBLING_KEYWORDS_EN:
            if keyword in seen:
                continue
            seen.add(keyword)
            if keyword in path_query:
                matched.append({
                    'rule': 'keyword_path_query',
                    'weight': weight * 0.4,
                    'details': f"Gambling keyword in path/query: '{keyword}'",
                    'category': category,
                })
        
        return matched
    
    def _check_indonesian_patterns(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for Indonesian gambling patterns."""
        matched = []
        full_text = parsed['full_text']
        
        for pattern, weight, category in self.id_patterns:
            if pattern.search(full_text):
                matched.append({
                    'rule': 'indonesian_pattern',
                    'weight': weight,
                    'details': f"Indonesian gambling pattern: {pattern.pattern}",
                    'category': category,
                })
        
        return matched
    
    def _check_path_patterns(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for suspicious path patterns."""
        matched = []
        path = parsed['path']
        
        for pattern, weight, category in self.path_patterns:
            if pattern.search(path):
                matched.append({
                    'rule': 'suspicious_path',
                    'weight': weight,
                    'details': f"Suspicious path pattern: {pattern.pattern}",
                    'category': category,
                })
        
        return matched
    
    def _check_number_patterns(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for number patterns in domain."""
        matched = []
        domain = parsed['netloc']
        
        # Find all numbers in domain
        numbers = re.findall(r'\d+', domain)
        
        if numbers:
            # Multiple numbers
            if len(numbers) >= 2:
                matched.append({
                    'rule': 'multiple_numbers',
                    'weight': 0.1 * len(numbers),
                    'details': f"Multiple numbers in domain: {', '.join(numbers)}",
                    'category': 'number_pattern',
                })
            
            # Large numbers (common in gambling: 888, 777, etc.)
            for num in numbers:
                if len(num) >= 3 and all(c == num[0] for c in num):  # All same digit
                    matched.append({
                        'rule': 'repeating_number',
                        'weight': 0.15,
                        'details': f"Repeating number pattern: {num}",
                        'category': 'number_pattern',
                    })
        
        return matched
    
    def _check_subdomain_patterns(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check subdomain depth and patterns."""
        matched = []
        domain_parts = parsed['domain_parts']
        
        # Deep subdomain nesting
        if len(domain_parts) > 3:
            matched.append({
                'rule': 'deep_subdomain',
                'weight': 0.05 * (len(domain_parts) - 3),
                'details': f"Deep subdomain nesting ({len(domain_parts)} levels)",
                'category': 'structure',
            })
        
        return matched
    
    def _check_entropy(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Calculate entropy of domain (random-looking domains)."""
        matched = []
        domain = parsed['domain'].replace('.', '')
        
        if len(domain) >= 8:
            # Calculate character entropy
            char_counts = {}
            for char in domain:
                char_counts[char] = char_counts.get(char, 0) + 1
            
            entropy = 0
            total = len(domain)
            for count in char_counts.values():
                p = count / total
                entropy -= p * math.log2(p)
            
            # High entropy suggests random string
            if entropy > 4.0:
                matched.append({
                    'rule': 'high_entropy',
                    'weight': 0.1,
                    'details': f"High entropy domain (entropy: {entropy:.2f})",
                    'category': 'structure',
                })
        
        return matched
    
    def _check_hyphen_digit_excess(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for excessive hyphens and digits."""
        matched = []
        domain = parsed['netloc']
        
        # Count hyphens
        hyphen_count = domain.count('-')
        if hyphen_count >= 3:
            matched.append({
                'rule': 'hyphen_excess',
                'weight': 0.05 * hyphen_count,
                'details': f"Excessive hyphens in domain ({hyphen_count})",
                'category': 'structure',
            })
        
        # Digit percentage
        digit_count = sum(c.isdigit() for c in domain)
        total_chars = len(domain)
        if total_chars > 0 and digit_count / total_chars > 0.3:  # 30% digits
            matched.append({
                'rule': 'digit_excess',
                'weight': 0.1,
                'details': f"High digit percentage ({digit_count/total_chars:.1%})",
                'category': 'structure',
            })
        
        return matched
    
    def _check_punycode(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for punycode/internationalized domains."""
        matched = []
        domain = parsed['netloc']
        
        # Check for punycode (xn-- prefix)
        if 'xn--' in domain:
            matched.append({
                'rule': 'punycode_domain',
                'weight': 0.05,
                'details': "Punycode/internationalized domain detected",
                'category': 'structure',
            })
        
        return matched
    
    def _calculate_score(self, matched_rules: List[Dict[str, Any]],
                         trusted_tld: bool = False) -> float:
        """Calculate final score from matched rules."""
        if not matched_rules:
            return 0.0
        
        # Noisy-OR: each rule is independent evidence, so one strong keyword
        # (e.g. "togel" in the domain) is enough on its own, and more rules
        # push the score toward 1.0 without ever exceeding it.
        remaining = 1.0
        for rule in matched_rules:
            remaining *= 1.0 - min(max(rule['weight'], 0.0), 0.95)

        score = 1.0 - remaining
        if trusted_tld:
            score *= 0.3
        return score

    # Government/education domains are very unlikely to be gambling sites
    TRUSTED_SUFFIXES = ('.go.id', '.ac.id', '.sch.id', '.mil.id', '.edu', '.gov')

    def _is_trusted_tld(self, parsed: Dict[str, Any]) -> bool:
        host = parsed['netloc'].split(':')[0]
        return host.endswith(self.TRUSTED_SUFFIXES)

    def _create_evidence(self, matched_rules: List[Dict[str, Any]], 
                         parsed: Dict[str, Any], score: float) -> Dict[str, Any]:
        """Create evidence dictionary."""
        return {
            'matched_rules': matched_rules,
            'rules_count': len(matched_rules),
            'url_components': {
                'domain': parsed['domain'],
                'tld': parsed['tld'],
                'subdomain': parsed['subdomain'],
                'path': parsed['path'],
                'has_query': bool(parsed['query']),
                'has_fragment': bool(parsed['fragment']),
            },
            'risk_level': 'high' if score >= self.high_risk_threshold else 'normal',
            'score_breakdown': {
                'total_rules': len(matched_rules),
                'total_weight': sum(r['weight'] for r in matched_rules),
                'categories': {},
            },
        }
    
    def _create_skipped_result(self, reason: str, start_time: float) -> DetectionResult:
        """Create skipped result."""
        return DetectionResult(
            detector=DetectorType.URL_PATTERN,
            status=DetectionStatus.SKIPPED,
            label="Skipped",
            score=0.0,
            evidence={'reason': reason},
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def _create_error_result(self, error_message: str, start_time: float) -> DetectionResult:
        """Create error result."""
        return DetectionResult(
            detector=DetectorType.URL_PATTERN,
            status=DetectionStatus.FAILED,
            label="Error",
            score=0.0,
            error=DetectorError(
                code="URL_PATTERN_ERROR",
                message_id="url_pattern_detection_failed",
                details={'error': error_message}
            ),
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def batch_detect(self, urls: List[str], timeout: float = 1.0,
                     max_workers: int = 4) -> List[DetectionResult]:
        """Detect patterns in multiple URLs concurrently."""
        results = []
        for url in urls:
            try:
                result = self.detect(url, timeout)
                results.append(result)
            except Exception as e:
                self.logger.error(f"Batch detection failed for URL {url}: {e}")
                results.append(self._create_error_result(str(e), time.time()))
        
        return results


# Default detector instance
default_url_pattern_detector = URLPatternDetector()