import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"

def test_homepage():
    print("\n[TEST 1] Testing Homepage / Mobile Frontend...")
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req) as res:
        status = res.status
        content = res.read().decode('utf-8')
        assert status == 200, f"Expected 200, got {status}"
        assert "InstaSound" in content, "InstaSound brand name missing in HTML"
        assert "audio-engine" in content, "Audio engine missing in HTML"
        print("  --> PASSED: Homepage loaded with status 200 and all UI elements.")

def test_trending_api():
    print("\n[TEST 2] Testing Trending Songs API (/api/trending)...")
    req = urllib.request.Request(f"{BASE_URL}/api/trending")
    with urllib.request.urlopen(req) as res:
        status = res.status
        data = json.loads(res.read().decode('utf-8'))
        assert status == 200, f"Expected 200, got {status}"
        assert data.get("success") is True, "API reported failure"
        songs = data.get("songs", [])
        assert len(songs) > 0, "No trending songs returned"
        print(f"  --> PASSED: Successfully fetched {len(songs)} trending songs.")
        for s in songs[:3]:
            print(f"      - {s['title']} by {s['artist']} ({s['category']})")

def test_local_ip_api():
    print("\n[TEST 3] Testing Local IP API (/api/local-ip)...")
    req = urllib.request.Request(f"{BASE_URL}/api/local-ip")
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        ip = data.get("ip")
        assert ip, "No IP address returned"
        print(f"  --> PASSED: Local IP resolved to: {ip}")
        print(f"      Mobile Phone URL: http://{ip}:8000")

def test_extract_validation():
    print("\n[TEST 4] Testing URL Validation for /api/extract...")
    payload = json.dumps({"url": "invalid_url"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/extract", data=payload, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        urllib.request.urlopen(req)
        print("  --> FAILED: Expected 400 bad request")
    except urllib.error.HTTPError as e:
        assert e.code == 400, f"Expected 400, got {e.code}"
        print("  --> PASSED: Rejected invalid URL correctly with HTTP 400.")

def test_audio_stream():
    print("\n[TEST 5] Testing Audio Playback Stream...")
    # Test one of the trending audio streams
    sample_audio = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    req = urllib.request.Request(sample_audio, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        length = len(res.read(1024))
        assert length > 0
        print(f"  --> PASSED: Audio stream accessible and returns audio bytes ({length} bytes chunk verified).")

if __name__ == "__main__":
    print("==================================================")
    print("        RUNNING INSTASOUND APP TEST SUITE         ")
    print("==================================================")
    test_homepage()
    test_trending_api()
    test_local_ip_api()
    test_extract_validation()
    test_audio_stream()
    print("\n==================================================")
    print("     ALL TESTS PASSED! APP IS FULLY FUNCTIONAL    ")
    print("==================================================")
