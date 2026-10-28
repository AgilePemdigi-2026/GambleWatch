"""Keyword provider with Supabase caching and local fallback."""

import json
import os
import time
from typing import List, Dict, Optional
from pathlib import Path
from dataclasses import dataclass
import logging

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None


@dataclass
class GamblingKeyword:
    """Gambling keyword data structure."""
    term: str
    category: str  # e.g., "slot", "casino", "payment", "brand"
    weight: float  # 0.0 to 1.0
    active: bool
    language: str = "id"  # "id" for Indonesian, "en" for English
    variations: Optional[List[str]] = None
    aliases: Optional[List[str]] = None


class KeywordProvider:
    """Provides gambling keywords from Supabase with local fallback."""
    
    # Seed list of Indonesian gambling keywords (from TypeScript code)
    SEED_KEYWORDS = [
        # Indonesian keywords
        {"term": "judi", "category": "gambling", "weight": 0.9, "active": True, "language": "id"},
        {"term": "taruhan", "category": "betting", "weight": 0.8, "active": True, "language": "id"},
        {"term": "togel", "category": "lottery", "weight": 0.9, "active": True, "language": "id"},
        {"term": "slot", "category": "slot", "weight": 0.7, "active": True, "language": "id"},
        {"term": "betting", "category": "betting", "weight": 0.8, "active": True, "language": "id"},
        {"term": "bandar", "category": "agent", "weight": 0.3, "active": True, "language": "id"},
        {"term": "kasino", "category": "casino", "weight": 0.9, "active": True, "language": "id"},
        {"term": "poker", "category": "card_game", "weight": 0.7, "active": True, "language": "id"},
        {"term": "domino", "category": "card_game", "weight": 0.6, "active": True, "language": "id"},
        {"term": "ceme", "category": "card_game", "weight": 0.8, "active": True, "language": "id"},
        {"term": "bola", "category": "sports", "weight": 0.5, "active": True, "language": "id"},
        {"term": "sabung", "category": "sports", "weight": 0.7, "active": True, "language": "id"},
        {"term": "ayam", "category": "sports", "weight": 0.6, "active": True, "language": "id"},
        {"term": "maxwin", "category": "promotion", "weight": 0.7, "active": True, "language": "id"},
        {"term": "gacor", "category": "promotion", "weight": 0.6, "active": True, "language": "id"},
        {"term": "jackpot", "category": "promotion", "weight": 0.8, "active": True, "language": "id"},
        {"term": "sbobet", "category": "brand", "weight": 0.9, "active": True, "language": "id"},
        {"term": "ibcbet", "category": "brand", "weight": 0.8, "active": True, "language": "id"},
        {"term": "maxbet", "category": "brand", "weight": 0.8, "active": True, "language": "id"},
        {"term": "ligaciputra", "category": "brand", "weight": 0.7, "active": True, "language": "id"},
        
        # English keywords
        {"term": "casino", "category": "casino", "weight": 0.9, "active": True, "language": "en"},
        {"term": "gamble", "category": "gambling", "weight": 0.8, "active": True, "language": "en"},
        {"term": "bet", "category": "betting", "weight": 0.7, "active": True, "language": "en"},
        {"term": "poker", "category": "card_game", "weight": 0.7, "active": True, "language": "en"},
        {"term": "lottery", "category": "lottery", "weight": 0.8, "active": True, "language": "en"},
        {"term": "roulette", "category": "casino", "weight": 0.8, "active": True, "language": "en"},
        {"term": "blackjack", "category": "card_game", "weight": 0.7, "active": True, "language": "en"},
        {"term": "baccarat", "category": "card_game", "weight": 0.7, "active": True, "language": "en"},
        {"term": "sportsbook", "category": "sports", "weight": 0.8, "active": True, "language": "en"},
        {"term": "wager", "category": "betting", "weight": 0.7, "active": True, "language": "en"},
        {"term": "odds", "category": "betting", "weight": 0.6, "active": True, "language": "en"},
        {"term": "stakes", "category": "betting", "weight": 0.6, "active": True, "language": "en"},
        {"term": "slot", "category": "slot", "weight": 0.7, "active": True, "language": "en"},
    ]
    
    def __init__(self, local_fallback_path: str = "data/keywords.json", 
                 cache_ttl_minutes: int = 15):
        self.local_fallback_path = Path(local_fallback_path)
        self.cache_ttl_minutes = cache_ttl_minutes
        self.logger = logging.getLogger(__name__)
        
        # Cache state
        self._keywords_cache: Optional[List[GamblingKeyword]] = None
        self._cache_timestamp: float = 0
        self._supabase_client = None
        
        # Ensure data directory exists
        self.local_fallback_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize Supabase if available
        self._init_supabase()
    
    def _init_supabase(self):
        """Initialize Supabase client if the package and credentials exist."""
        if not SUPABASE_AVAILABLE:
            self.logger.warning("Supabase client not installed. Using local keywords only.")
            return

        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            self.logger.info("SUPABASE_URL / SUPABASE_KEY not set. Using local keywords.")
            return

        try:
            self._supabase_client = create_client(url, key)
            self.logger.info("Supabase client initialized successfully.")
        except Exception as e:
            self.logger.warning(f"Failed to initialize Supabase: {e}. Using local keywords.")
            self._supabase_client = None
    
    def get_keywords(self, force_refresh: bool = False) -> List[GamblingKeyword]:
        """
        Get keywords from cache, Supabase, or local fallback.
        
        Priority:
        1. Cache (if not expired)
        2. Supabase (if available)
        3. Local JSON file
        4. Seed keywords
        """
        # Check cache first
        if not force_refresh and self._is_cache_valid():
            return self._keywords_cache
        
        keywords = None
        
        # Try Supabase
        if self._supabase_client:
            keywords = self._fetch_from_supabase()
        
        # Try local file
        if not keywords:
            keywords = self._load_from_local_file()
        
        # Use seed keywords as last resort
        if not keywords:
            keywords = self._get_seed_keywords()
            self.logger.info("Using seed keywords as fallback")
        
        # Cache the results
        self._keywords_cache = keywords
        self._cache_timestamp = time.time()
        
        # Save to local file for future use
        self._save_to_local_file(keywords)
        
        return keywords
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid."""
        if self._keywords_cache is None:
            return False
        
        cache_age_minutes = (time.time() - self._cache_timestamp) / 60
        return cache_age_minutes < self.cache_ttl_minutes
    
    def _fetch_from_supabase(self) -> Optional[List[GamblingKeyword]]:
        """Fetch active keywords from the Supabase 'keywords' table."""
        try:
            if not self._supabase_client:
                return None
            
            response = (
                self._supabase_client.table("keywords")
                .select("term, category, weight, active, language, variations, aliases")
                .eq("active", True)
                .execute()
            )
            
            keywords = []
            for data in response.data or []:
                keyword = GamblingKeyword(
                    term=data.get('term', ''),
                    category=data.get('category') or 'general',
                    weight=float(data.get('weight') or 0.5),
                    active=data.get('active', True),
                    language=data.get('language') or 'id',
                    variations=data.get('variations') or [],
                    aliases=data.get('aliases') or [],
                )
                keywords.append(keyword)
            
            self.logger.info(f"Loaded {len(keywords)} keywords from Supabase")
            return keywords
            
        except Exception as e:
            self.logger.error(f"Error fetching from Supabase: {e}")
            return None
    
    def _load_from_local_file(self) -> Optional[List[GamblingKeyword]]:
        """Load keywords from local JSON file."""
        try:
            if not self.local_fallback_path.exists():
                return None
            
            with open(self.local_fallback_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            keywords = []
            for item in data:
                keyword = GamblingKeyword(
                    term=item['term'],
                    category=item['category'],
                    weight=float(item['weight']),
                    active=item['active'],
                    language=item.get('language', 'id'),
                    variations=item.get('variations', []),
                    aliases=item.get('aliases', []),
                )
                keywords.append(keyword)
            
            self.logger.info(f"Loaded {len(keywords)} keywords from local file")
            return keywords
            
        except Exception as e:
            self.logger.error(f"Error loading local keywords: {e}")
            return None
    
    def _save_to_local_file(self, keywords: List[GamblingKeyword]):
        """Save keywords to local JSON file."""
        try:
            data = []
            for keyword in keywords:
                data.append({
                    'term': keyword.term,
                    'category': keyword.category,
                    'weight': keyword.weight,
                    'active': keyword.active,
                    'language': keyword.language,
                    'variations': keyword.variations or [],
                    'aliases': keyword.aliases or [],
                })
            
            with open(self.local_fallback_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Saved {len(keywords)} keywords to local file")
            
        except Exception as e:
            self.logger.error(f"Error saving local keywords: {e}")
    
    def _get_seed_keywords(self) -> List[GamblingKeyword]:
        """Get seed keywords."""
        keywords = []
        for item in self.SEED_KEYWORDS:
            keyword = GamblingKeyword(
                term=item['term'],
                category=item['category'],
                weight=item['weight'],
                active=item['active'],
                language=item['language'],
            )
            keywords.append(keyword)
        return keywords
    
    def get_active_keywords_by_language(self, language: str = "id") -> List[GamblingKeyword]:
        """Get active keywords for a specific language."""
        all_keywords = self.get_keywords()
        return [k for k in all_keywords if k.active and k.language == language]
    
    def get_keywords_by_category(self, category: str) -> List[GamblingKeyword]:
        """Get keywords by category."""
        all_keywords = self.get_keywords()
        return [k for k in all_keywords if k.active and k.category == category]
    
    def refresh_keywords(self):
        """Force refresh keywords from source."""
        self.get_keywords(force_refresh=True)
    
    def add_keyword(self, keyword: GamblingKeyword):
        """Add a new keyword (will be saved to local file)."""
        keywords = self.get_keywords()
        keywords.append(keyword)
        self._save_to_local_file(keywords)
        self.refresh_keywords()


# Default provider instance
default_keyword_provider = KeywordProvider()