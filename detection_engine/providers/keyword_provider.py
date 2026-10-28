"""Keyword provider with Firestore caching and local fallback."""

import json
import os
import time
from typing import List, Dict, Optional
from pathlib import Path
from dataclasses import dataclass
import logging

try:
    import firebase_admin
    from firebase_admin import firestore
    from google.cloud import firestore as google_firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    google_firestore = None


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
    """Provides gambling keywords from Firestore with local fallback."""
    
    # Seed list of Indonesian gambling keywords (from TypeScript code)
    SEED_KEYWORDS = [
        # Indonesian keywords
        {"term": "judi", "category": "gambling", "weight": 0.9, "active": True, "language": "id"},
        {"term": "taruhan", "category": "betting", "weight": 0.8, "active": True, "language": "id"},
        {"term": "togel", "category": "lottery", "weight": 0.9, "active": True, "language": "id"},
        {"term": "slot", "category": "slot", "weight": 0.7, "active": True, "language": "id"},
        {"term": "betting", "category": "betting", "weight": 0.8, "active": True, "language": "id"},
        {"term": "bandar", "category": "agent", "weight": 0.8, "active": True, "language": "id"},
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
        self._firestore_client = None
        
        # Ensure data directory exists
        self.local_fallback_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize Firebase if available
        self._init_firebase()
    
    def _init_firebase(self):
        """Initialize Firebase Admin SDK if available."""
        if not FIREBASE_AVAILABLE:
            self.logger.warning("Firebase Admin SDK not available. Using local keywords only.")
            return
        
        # Without credentials, initialize_app() makes the Google auth library
        # probe for a metadata server, which stalls every detector start by
        # tens of seconds. Skip Firestore unless it is actually configured.
        if not any(os.environ.get(v) for v in
                   ("GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_CONFIG", "K_SERVICE")):
            self.logger.info("No Firebase credentials configured. Using local keywords.")
            return

        try:
            # Try to initialize Firebase (user must have credentials)
            if not firebase_admin._apps:
                # In production, credentials should be set via environment variables
                # or service account file
                firebase_admin.initialize_app()
            
            self._firestore_client = firestore.client()
            self.logger.info("Firebase Admin SDK initialized successfully.")
            
        except Exception as e:
            self.logger.warning(f"Failed to initialize Firebase: {e}. Using local keywords.")
            self._firestore_client = None
    
    def get_keywords(self, force_refresh: bool = False) -> List[GamblingKeyword]:
        """
        Get keywords from cache, Firestore, or local fallback.
        
        Priority:
        1. Cache (if not expired)
        2. Firestore (if available)
        3. Local JSON file
        4. Seed keywords
        """
        # Check cache first
        if not force_refresh and self._is_cache_valid():
            return self._keywords_cache
        
        keywords = None
        
        # Try Firestore
        if self._firestore_client:
            keywords = self._fetch_from_firestore()
        
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
    
    def _fetch_from_firestore(self) -> Optional[List[GamblingKeyword]]:
        """Fetch keywords from Firestore."""
        try:
            if not self._firestore_client:
                return None
            
            # Assuming keywords are stored in 'keywords' collection
            keywords_ref = self._firestore_client.collection('keywords')
            docs = keywords_ref.where('active', '==', True).stream()
            
            keywords = []
            for doc in docs:
                data = doc.to_dict()
                keyword = GamblingKeyword(
                    term=data.get('term', ''),
                    category=data.get('category', 'general'),
                    weight=float(data.get('weight', 0.5)),
                    active=data.get('active', True),
                    language=data.get('language', 'id'),
                    variations=data.get('variations', []),
                    aliases=data.get('aliases', []),
                )
                keywords.append(keyword)
            
            self.logger.info(f"Loaded {len(keywords)} keywords from Firestore")
            return keywords
            
        except Exception as e:
            self.logger.error(f"Error fetching from Firestore: {e}")
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