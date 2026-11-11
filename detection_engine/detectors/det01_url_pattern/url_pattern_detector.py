"""DET-01: URL Pattern Detection with weighted rule engine."""

import re
import time
import logging
import math
from typing import List, Dict, Any, Optional, Pattern, Tuple
from urllib.parse import urlparse, parse_qs

from detection_engine.config.gambling_brands import (
    CHEAP_TLDS, STEM_NUMBER_GLUED, WORD_GAMBLING_NUMBER, WORD_LUCKY_NUMBER,
)

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
        ('bandar', 0.3, 'agent'),  # also a place name (Bandar Lampung) and "airport"
        ('kasino', 0.9, 'casino'),
        ('poker', 0.7, 'card_game'),
        ('domino', 0.4, 'card_game'),
        ('ceme', 0.8, 'card_game'),
        ('bola', 0.3, 'sports'),  # "football": same weight as data/keywords.json
        ('sabung', 0.7, 'sports'),
        ('ayam', 0.3, 'sports'),
        ('maxwin', 0.7, 'promotion'),
        ('gacor', 0.3, 'promotion'),  # also sports slang ("striker gacor")
        ('jackpot', 0.8, 'promotion'),
        ('sbobet', 0.9, 'brand'),
        ('ibcbet', 0.8, 'brand'),
        ('maxbet', 0.8, 'brand'),
        ('ligaciputra', 0.7, 'brand'),
        # Game, provider and betting terms (data/keywords.json, DET-04)
        ('slotgacor', 0.9, 'slot'),  # thousands of *.pages.dev spam sites (crt.sh)
        ('parlay', 0.7, 'sports'),
        ('sicbo', 0.8, 'casino'),
        ('pgsoft', 0.7, 'provider'),
        ('idnpoker', 0.9, 'card_game'),
        ('sv388', 0.9, 'sports'),
        ('dominoqq', 0.9, 'card_game'),
        ('bandarq', 0.8, 'card_game'),
        ('qiuqiu', 0.8, 'card_game'),
        ('paito', 0.7, 'lottery'),
        ('livedraw', 0.8, 'lottery'),  # togel result draw; nothing else is called that
        ('rtplive', 0.7, 'game_info'),
        # Ambiguous on their own (a Greek god, a camera brand, a board game,
        # a toilet brand, a data-viz "scatter plot"); only support a real signal
        ('scatter', 0.4, 'slot'),
        ('zeus', 0.3, 'slot'),
        ('olympus', 0.2, 'slot'),
        ('mahjong', 0.3, 'slot'),
        ('toto', 0.3, 'lottery'),
        # "judol" is left out: it appears in news slugs ("polisi-bongkar-judol"),
        # never in the name of a gambling site
        # Site names promoted in YouTube/TikTok spam (HuggingFace datasets
        # KagChi/indonesian-gambling-words, 0xRafie/indonesian-gambling-multimodal-dataset)
        ('alexis17', 0.9, 'brand'), ('weton88', 0.9, 'brand'), ('sgi88', 0.9, 'brand'),
        ('axl777', 0.9, 'brand'), ('dora77', 0.9, 'brand'), ('pulau777', 0.9, 'brand'),
        ('berkah99', 0.9, 'brand'), ('pluto88', 0.9, 'brand'), ('aero88', 0.9, 'brand'),
        ('pstoto', 0.9, 'brand'), ('hoki777', 0.9, 'brand'), ('squad777', 0.9, 'brand'),
        ('mona4d', 0.9, 'brand'), ('kusumatoto', 0.9, 'brand'), ('mandalika77', 0.9, 'brand'),
        ('macau328', 0.9, 'brand'), ('lesti77', 0.9, 'brand'), ('thor311', 0.9, 'brand'),
        ('vegashoki', 0.9, 'brand'), ('388hero', 0.9, 'brand'), ('grd138', 0.9, 'brand'),
        ('qqsuper99', 0.9, 'brand'), ('pohon4d', 0.9, 'brand'), ('77lucky', 0.9, 'brand'),
        ('nagaplay', 0.9, 'brand'), ('joker123', 0.9, 'brand'), ('mega888', 0.9, 'brand'),
        ('918kiss', 0.9, 'brand'), ('pussy888', 0.9, 'brand'), ('cmd368', 0.9, 'brand'),
        ('afb88', 0.9, 'brand'),
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
        (r'[a-z]{2,}bet\d{0,4}(?:[.\-/]|$)', 0.5, 'bet_suffix_brand'),  # dewabet88.com, pasarbet.com
        (r'\d+bet', 0.8, 'number_brand'),
        (r'\d+togel', 0.8, 'number_brand'),
        (r'togel\d+', 0.8, 'number_brand'),
        (r'toto\d+', 0.7, 'number_brand'),   # pstoto99, toto88
        (r'\d+toto', 0.7, 'number_brand'),
        (r'\d+judi', 0.8, 'number_brand'),
        (r'\d+slot', 0.7, 'number_slot'),
        (r'slot\d+', 0.7, 'slot_number'),
        (r'gacor\d+', 0.6, 'promotion_number'),
        (r'\d+gacor', 0.6, 'number_promotion'),
        (r'maxwin\d+', 0.7, 'promotion_number'),
        (r'\d+maxwin', 0.7, 'number_promotion'),
    ]
    
    # Path segments that point to gambling on their own. "/slot" and "/rtp"
    # may be glued to more words ("/slotgacor88", "/rtppragmaticplay"), but
    # not "/rtpcr" (a COVID test). "live draw" is the togel result draw.
    GAMBLING_PATHS = [
        (r'/slot', 0.7, 'slot_path'),
        (r'/rtp(?!-?cr)', 0.7, 'game_info'),
        (r'live[\-_]?draw', 0.7, 'lottery_draw'),
    ]

    # Path words every ordinary site uses too: a bank has "/deposito", a shop
    # "/login" and "/promo", a news site "/daftar-harga" and "/liverpool".
    # They are matched as whole words and only count as supporting evidence,
    # i.e. when the URL already carries a real gambling signal (an anchor).
    GENERIC_PATHS = [
        ('daftar', 0.6, 'registration'),
        ('login', 0.5, 'login'),
        ('register', 0.5, 'registration'),
        ('deposit', 0.8, 'payment'),
        ('withdraw', 0.8, 'payment'),
        ('bonus', 0.6, 'promotion'),
        ('promo', 0.6, 'promotion'),
        ('live', 0.6, 'live_casino'),
    ]

    # A keyword this heavy (before the position factor) can anchor a URL;
    # lighter ones ("bola", "bandar", "gacor", "domino") cannot. Same idea
    # as DET-04's ANCHOR_WEIGHT.
    ANCHOR_WEIGHT = 0.5

    # Second-level labels under a country TLD: "contoh.co.id" is one site,
    # not the subdomain "contoh" of "co.id".
    SECOND_LEVEL_LABELS = {
        'co', 'go', 'ac', 'or', 'sch', 'mil', 'web', 'my', 'biz', 'net',
        'desa', 'ponpes', 'com', 'org', 'gov', 'edu',
    }

    # Path words of reporting/enforcement pages. On a trusted (.go.id, .ac.id)
    # site they mark news about gambling, not gambling spam.
    URL_INFO_CUES = (
        'berita', 'news', 'artikel', 'pengumuman', 'siaran', 'press', 'wiki',
        'blokir', 'pemblokiran', 'diblokir', 'polisi', 'polri', 'waspada',
        'bahaya', 'edukasi', 'sosialisasi', 'pidana', 'tersangka', 'ditangkap',
    )
    # Path keywords at least this heavy look like spam planted on a hacked site
    SPAM_KEYWORD_WEIGHT = 0.7

    def __init__(self, high_risk_threshold: float = 0.6):
        self.high_risk_threshold = high_risk_threshold
        self.logger = logging.getLogger(__name__)
        
        # Compile regex patterns
        self.id_patterns = [
            (re.compile(pattern, re.IGNORECASE), weight, category)
            for pattern, weight, category in self.INDONESIAN_GAMBLING_PATTERNS
        ]
        self.gambling_path_patterns = [
            (re.compile(pattern, re.IGNORECASE), weight, category)
            for pattern, weight, category in self.GAMBLING_PATHS
        ]
        # Whole word at the start of a path segment: "/deposit", "/deposit-pulsa"
        # and "/login/" match; "/deposito" and "/liverpool" do not.
        self.generic_path_patterns = [
            (re.compile(rf'(?:^|/){word}(?=$|[/\-_.])', re.IGNORECASE), weight, category)
            for word, weight, category in self.GENERIC_PATHS
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
            damp = self._is_trusted_tld(parsed) and not self._spam_on_trusted_site(
                parsed, matched_rules)
            score = self._calculate_score(matched_rules, damp)
            
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

            # Extract components. The host excludes the port and any
            # "user:pass@" part, which say nothing about the site itself.
            scheme = parsed.scheme.lower()
            netloc = (parsed.hostname or '').lower().rstrip('.')
            if not netloc:
                return None
            path = parsed.path.lower()
            query = parsed.query.lower()
            fragment = parsed.fragment.lower()

            # Extract domain parts: registrable domain ("contoh.co.id"), its
            # name label ("contoh") and the subdomain without "www"
            domain_parts = netloc.split('.')
            size = 2
            if (len(domain_parts) >= 3 and len(domain_parts[-1]) == 2
                    and domain_parts[-2] in self.SECOND_LEVEL_LABELS):
                size = 3
            size = min(size, len(domain_parts))
            domain = '.'.join(domain_parts[-size:])
            name = domain_parts[-size]
            tld = '.' + domain_parts[-1]
            sub_labels = domain_parts[:-size]
            if sub_labels and sub_labels[0] == 'www':
                sub_labels = sub_labels[1:]
            subdomain = '.'.join(sub_labels)

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
                'name': name,
                'tld': tld,
                'subdomain': subdomain,
                'sub_labels': sub_labels,
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

        # Rule 4b: brand names <word><number> (zeus123, hoki138, mpo88)
        matched_rules.extend(self._check_brand_names(parsed))
        
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

        # Generic path words ("/login", "/deposit") only support a real
        # gambling signal; on their own they describe any ordinary site.
        if not any(rule.get('anchor') for rule in matched_rules):
            matched_rules = [rule for rule in matched_rules if not rule.get('supporting')]

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
                    'anchor': True,
                })
                break  # Only count once

        # Cheap TLDs (.xyz, .top, .site, ...) host many throwaway gambling sites,
        # but ordinary sites too: supporting evidence only.
        if not matched and tld.endswith(CHEAP_TLDS):
            matched.append({
                'rule': 'cheap_tld',
                'weight': 0.2,
                'details': f"Cheap TLD often used by gambling sites: {tld}",
                'category': 'tld',
                'supporting': True,
            })

        return matched

    def _check_brand_names(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Indonesian gambling brands are named <word><number>: zeus123, hoki138, mpo88.

        Patterns live in detection_engine/config/gambling_brands.py (shared with DET-04).
        In the host name: a known brand word + any number, or any word + a
        number used almost only by gambling brands (138, 303, 4d) is an anchor;
        any word + a lucky number (88, 777) only supports another signal.
        In the path the same names count less (platform pages, slugs).
        """
        matched = []
        host = self._strip_benign('.'.join(parsed['sub_labels'] + [parsed['name']]))
        path = parsed['path'].lower()

        def rule(name, weight, found, where, anchor):
            return {
                'rule': name,
                'weight': weight,
                'details': f"Gambling brand name in {where}: '{found}'",
                'category': 'brand_number',
                'anchor' if anchor else 'supporting': True,
            }

        stem = STEM_NUMBER_GLUED.search(host)
        number = WORD_GAMBLING_NUMBER.search(host)
        lucky = WORD_LUCKY_NUMBER.search(host)
        # 0.75: on its own enough for "Tinggi" (>= 0.7). Checked on Tranco top
        # 200k (11/11/2026): the domains it flags are almost all gambling sites.
        if stem:
            matched.append(rule('brand_number_domain', 0.75, stem.group(), 'domain', True))
        elif number:
            matched.append(rule('brand_number_domain', 0.55, number.group(), 'domain', True))
        elif lucky:
            matched.append(rule('lucky_number_domain', 0.2, lucky.group(), 'domain', False))

        stem = STEM_NUMBER_GLUED.search(path)
        number = WORD_GAMBLING_NUMBER.search(path)
        lucky = WORD_LUCKY_NUMBER.search(path)
        if stem:
            matched.append(rule('brand_number_path', 0.5, stem.group(), 'path', True))
        elif number:
            matched.append(rule('brand_number_path', 0.3, number.group(), 'path', False))
        elif lucky:
            matched.append(rule('lucky_number_path', 0.15, lucky.group(), 'path', False))

        return matched

    # Ordinary words that merely contain a gambling keyword ("alphabet" has
    # "bet"). They are blanked out before keyword matching. Domains glue words
    # together ("togelonline", "dewabet"), so keywords cannot be matched as
    # whole words here; this list covers the common false friends instead.
    # Only whole words: never a fragment such as "abet", which would also
    # erase the "abet" in brands like "dewabet". "cement" covers placement,
    # announcement, replacement, ... (all contain "ceme"); "diabet" covers
    # diabetes/diabetic ("bet"); "mistake" contains "stake".
    BENIGN_WORDS = (
        'alphabetical', 'alphabet', 'alfabet', 'between', 'better',
        'bethesda', 'bethany', 'betsy', 'betty', 'beta',
        'cement', 'diabet', 'mistake',
        'judicia', 'judith',  # judicial/judiciary contain "judi"
    )

    def _strip_benign(self, text: str) -> str:
        for word in self.BENIGN_WORDS:
            text = text.replace(word, ' ')
        return text

    def _keyword_rule(self, rule: str, keyword: str, weight: float, factor: float,
                      category: str, where: str) -> Dict[str, Any]:
        return {
            'rule': rule,
            'weight': weight * factor,
            'base_weight': weight,
            'details': f"Gambling keyword in {where}: '{keyword}'",
            'category': category,
            'anchor': weight >= self.ANCHOR_WEIGHT,
        }

    def _check_domain_keywords(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for gambling keywords in the site name and its subdomains.

        The TLD and second-level suffix (".co.id") are left out, and each
        keyword counts once even if it appears in both name and subdomain.
        """
        matched = []
        host = self._strip_benign('.'.join(parsed['sub_labels'] + [parsed['name']]))

        # Check Indonesian keywords
        for keyword, weight, category in self.GAMBLING_KEYWORDS_ID:
            if keyword in host:
                matched.append(self._keyword_rule(
                    'indonesian_keyword_domain', keyword, weight, 0.8, category, 'domain'))

        # Check English keywords (skip ones already counted as Indonesian,
        # e.g. "slot" and "poker" appear in both lists)
        id_keywords = {k for k, _, _ in self.GAMBLING_KEYWORDS_ID}
        for keyword, weight, category in self.GAMBLING_KEYWORDS_EN:
            if keyword in id_keywords:
                continue
            if keyword in host:
                matched.append(self._keyword_rule(
                    'english_keyword_domain', keyword, weight, 0.6, category, 'domain'))

        return matched

    def _check_path_keywords(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for gambling keywords in path and query."""
        matched = []
        path_query = self._strip_benign(
            parsed['path'] + parsed['query'] + parsed['fragment'])

        seen = set()
        for keyword, weight, category in self.GAMBLING_KEYWORDS_ID + self.GAMBLING_KEYWORDS_EN:
            if keyword in seen:
                continue
            seen.add(keyword)
            if keyword in path_query:
                matched.append(self._keyword_rule(
                    'keyword_path_query', keyword, weight, 0.4, category, 'path/query'))

        return matched
    
    def _check_indonesian_patterns(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for Indonesian gambling patterns."""
        matched = []
        full_text = self._strip_benign(parsed['full_text'])
        
        for pattern, weight, category in self.id_patterns:
            if pattern.search(full_text):
                matched.append({
                    'rule': 'indonesian_pattern',
                    'weight': weight,
                    'details': f"Indonesian gambling pattern: {pattern.pattern}",
                    'category': category,
                    'anchor': True,
                })

        return matched

    def _check_path_patterns(self, parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for gambling paths and (supporting) generic paths."""
        matched = []
        path = parsed['path']

        for pattern, weight, category in self.gambling_path_patterns:
            if pattern.search(path):
                matched.append({
                    'rule': 'suspicious_path',
                    'weight': weight,
                    'details': f"Gambling path pattern: {pattern.pattern}",
                    'category': category,
                    'anchor': True,
                })
        for (pattern, weight, category), (word, _, _) in zip(
                self.generic_path_patterns, self.GENERIC_PATHS):
            if pattern.search(path):
                matched.append({
                    'rule': 'generic_path',
                    'weight': weight,
                    'details': f"Generic path word: /{word}",
                    'category': category,
                    'supporting': True,
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
        # Subdomain labels below the registrable domain, "www" excluded:
        # "a.b.contoh.co.id" has two, "www.contoh.co.id" none
        depth = len(parsed['sub_labels'])

        # Deep subdomain nesting
        if depth > 1:
            matched.append({
                'rule': 'deep_subdomain',
                'weight': 0.05 * (depth - 1),
                'details': f"Deep subdomain nesting ({depth} subdomain levels)",
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
    TRUSTED_SUFFIXES = ('.go.id', '.ac.id', '.sch.id', '.mil.id', '.edu', '.gov',
                        '.wikipedia.org')  # artikel "Slot_machine" bukan situs judi

    def _is_trusted_tld(self, parsed: Dict[str, Any]) -> bool:
        return ('.' + parsed['netloc']).endswith(self.TRUSTED_SUFFIXES)

    def _spam_on_trusted_site(self, parsed: Dict[str, Any],
                              matched_rules: List[Dict[str, Any]]) -> bool:
        """True if a trusted (.go.id, .ac.id, ...) URL looks like planted spam.

        Hacked government and campus sites are the most common host of
        Indonesian gambling spam ("dinkes.kab.go.id/slot-gacor-maxwin/"), so
        their URLs are not damped when the path itself carries a strong
        gambling keyword. Paths with reporting words ("/berita/blokir-situs-
        slot") are news about gambling and are still damped.
        """
        path = parsed['path'] + parsed['query']
        if any(cue in path for cue in self.URL_INFO_CUES):
            return False
        return any(rule['rule'] == 'keyword_path_query'
                   and rule.get('base_weight', 0) >= self.SPAM_KEYWORD_WEIGHT
                   for rule in matched_rules)

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