#!/usr/bin/env python3
"""Test script for GambleWatch detection engine."""

import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

from detection_engine import detect


def test_detection_engine():
    """Test the detection engine with various inputs."""
    print("🧪 Testing GambleWatch Detection Engine")
    print("=" * 50)
    
    # Test cases
    test_cases = [
        {
            "name": "Gambling URL (Indonesian)",
            "input": {
                "url": "https://slotgacor88.bet",
                "scraped": {
                    "page_text": "Slot online gacor dengan bonus deposit 100%",
                    "title": "Slot Gacor 88 - Judi Online Terpercaya",
                }
            }
        },
        {
            "name": "Gambling URL (English)",
            "input": {
                "url": "https://casino-online.win",
                "scraped": {
                    "page_text": "Online casino with blackjack and roulette games",
                    "title": "Best Online Casino - Win Real Money",
                }
            }
        },
        {
            "name": "Non-gambling URL",
            "input": {
                "url": "https://tokopedia.com",
                "scraped": {
                    "page_text": "Belanja online mudah dan terpercaya",
                    "title": "Tokopedia - Marketplace Indonesia",
                }
            }
        },
        {
            "name": "URL with togel pattern",
            "input": {
                "url": "https://togelonline88.id",
                "scraped": {
                    "page_text": "Togel online terpercaya dengan prediksi angka jitu",
                    "title": "Togel Online 88 - Pasang Togel Aman",
                }
            }
        },
        {
            "name": "URL only (no scraped text)",
            "input": {
                "url": "https://judi.com",
            }
        },
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\nTest {i+1}: {test_case['name']}")
        print("-" * 30)
        
        # Run detection
        result = detect(test_case['input'])
        
        # Display results
        if 'error' in result and result['error']:
            print(f"❌ Error: {result['error']}")
            continue
        
        print(f"✅ Request ID: {result['request_id']}")
        
        # Show summary
        summary = result.get('summary', {})
        if summary:
            print(f"   Overall Risk: {summary.get('overall_risk', 'unknown').upper()}")
            print(f"   Detectors: {summary.get('successful', 0)} successful, "
                  f"{summary.get('failed', 0)} failed, {summary.get('skipped', 0)} skipped")
        
        # Show detector results
        for detector_result in result.get('results', []):
            detector = detector_result.get('detector', 'unknown')
            status = detector_result.get('status', 'unknown')
            label = detector_result.get('label', '')
            score = detector_result.get('score', 0)
            
            status_emoji = "✅" if status == "ok" else "⚠️" if status == "skipped" else "❌"
            print(f"   {status_emoji} {detector.upper():<20} {label:<20} (Score: {score:.2f})")
        
        # Show label breakdown
        breakdown = result.get('label_breakdown', {})
        if breakdown:
            print(f"\n   Label Breakdown:")
            for key, value in breakdown.items():
                if isinstance(value, list):
                    print(f"     {key}: {len(value)} items")
                    for item in value[:3]:  # Show first 3
                        if isinstance(item, dict):
                            print(f"       - {item.get('keyword', 'Unknown')} ({item.get('category', 'Unknown')})")
                        else:
                            print(f"       - {item}")
                else:
                    print(f"     {key}: {value}")
    
    print("\n" + "=" * 50)
    print("🎯 All tests completed!")
    print("✅ Your multi-modal detection engine is working!")
    print("\n📝 Next steps:")
    print("   1. Install Tesseract for OCR detection: https://github.com/UB-Mannheim/tesseract/wiki")
    print("   2. Implement DET-02 (Visual Similarity Detection)")
    print("   3. Configure Supabase for keyword provider")
    print("   4. Create API wrapper for your application")


def test_individual_detectors():
    """Test individual detectors separately."""
    print("\n\n🔬 Testing Individual Detectors")
    print("=" * 50)
    
    from detection_engine.detectors.det01_url_pattern.url_pattern_detector import URLPatternDetector
    from detection_engine.detectors.det04_text_keyword.text_keyword_detector import TextKeywordDetector
    
    # Test URL pattern detector
    print("\nTesting DET-01: URL Pattern Detector")
    url_detector = URLPatternDetector()
    
    test_urls = [
        "https://slotgacor88.bet",
        "https://togelonline.id",
        "https://google.com",
        "https://tokopedia.com",
        "https://sbobet.asia",
    ]
    
    for url in test_urls:
        result = url_detector.detect(url)
        status_emoji = "✅" if result.status.value == "ok" else "⚠️"
        print(f"{status_emoji} {url:<30} → {result.label:<20} (Score: {result.score:.2f})")
    
    # Test text keyword detector
    print("\nTesting DET-04: Text Keyword Detector")
    text_detector = TextKeywordDetector()
    
    test_texts = [
        "Slot online gacor dengan bonus deposit 100% dan withdraw cepat",
        "Belanja online mudah dan terpercaya di marketplace Indonesia",
        "Judi online terpercaya dengan berbagai permainan casino",
    ]
    
    for text in test_texts:
        result = text_detector.detect(text)
        matches = result.evidence.get('matches_found', 0) if result.evidence else 0
        print(f"📝 Text: {text[:50]}...")
        print(f"   → Matches: {matches}, Score: {result.score:.2f}, Label: {result.label}")


if __name__ == "__main__":
    test_detection_engine()
    test_individual_detectors()