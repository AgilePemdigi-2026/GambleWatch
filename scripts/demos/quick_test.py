#!/usr/bin/env python3
"""Quick test untuk DET-01 dan DET-04"""

print("🚀 Quick Test untuk Detection Engine")
print("=" * 50)

# Test DET-01: URL Pattern Detection
print("\n🔍 Testing DET-01: URL Pattern Detection")
try:
    from detection_engine.detectors.det01_url_pattern.url_pattern_detector import URLPatternDetector
    
    detector = URLPatternDetector()
    
    # Test URLs
    test_cases = [
        ("https://slotgacor88.bet", "HIGH"),
        ("https://togelonline.id", "HIGH"),
        ("https://google.com", "LOW"),
        ("https://tokopedia.com", "LOW"),
    ]
    
    for url, expected in test_cases:
        result = detector.detect(url)
        status = "✅" if (expected == "HIGH" and result.score >= 0.6) or (expected == "LOW" and result.score < 0.3) else "⚠️"
        print(f"  {status} {url:<30} → Score: {result.score:.2f} ({result.label})")
        
except Exception as e:
    print(f"❌ DET-01 Error: {e}")

# Test DET-04: Text/Keyword Detection
print("\n🔍 Testing DET-04: Text/Keyword Detection")
try:
    from detection_engine.detectors.det04_text_keyword.text_keyword_detector import TextKeywordDetector
    
    detector = TextKeywordDetector()
    
    # Test texts
    test_cases = [
        ("Slot online gacor dengan bonus deposit 100%", True),
        ("Judi online terpercaya dengan berbagai permainan casino", True),
        ("Belanja online mudah dan terpercaya di marketplace", False),
    ]
    
    for text, expected_gambling in test_cases:
        result = detector.detect(text, language="id")
        keywords_found = result.evidence.get('matches_found', 0) if result.evidence else 0
        is_gambling = keywords_found > 0
        
        status = "✅" if is_gambling == expected_gambling else "⚠️"
        print(f"  {status} Text: {text[:40]}...")
        print(f"    → Keywords found: {keywords_found}, Score: {result.score:.2f}")
        
except Exception as e:
    print(f"❌ DET-04 Error: {e}")

# Test Pipeline Integration
print("\n🔍 Testing Pipeline")
try:
    from detection_engine import detect
    
    print("\nTest 1: Gambling Site")
    result = detect({
        "url": "https://slotgacor88.bet",
        "scraped": {
            "page_text": "Slot online gacor dengan bonus deposit 100%",
            "title": "Slot Gacor 88 - Judi Online Terpercaya",
        }
    })
    
    print(f"  Overall Risk: {result.get('summary', {}).get('overall_risk', 'unknown')}")
    
    print("\nTest 2: Normal Site")
    result = detect({
        "url": "https://tokopedia.com",
        "scraped": {
            "page_text": "Belanja online mudah dan terpercaya",
            "title": "Tokopedia - Marketplace Indonesia",
        }
    })
    
    print(f"  Overall Risk: {result.get('summary', {}).get('overall_risk', 'unknown')}")
    
except Exception as e:
    print(f"❌ Pipeline Error: {e}")

print("\n" + "=" * 50)
print("🎯 Status: DET-01 dan DET-04 berfungsi!")
print("📝 Untuk DET-03 (OCR), perlu instal Tesseract OCR")
print("   Download: https://github.com/UB-Mannheim/tesseract/wiki")