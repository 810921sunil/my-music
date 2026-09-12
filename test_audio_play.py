import urllib.request
import time
import json

def test_playback():
    print("Testing audio playback streaming for all trending songs...")
    res = urllib.request.urlopen('http://localhost:8000/api/trending')
    songs = json.loads(res.read().decode('utf-8'))['songs']

    success_count = 0
    for s in songs:
        t0 = time.time()
        try:
            req = urllib.request.Request(s['audio_url'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as a_res:
                data = a_res.read(65536) # read initial audio chunk
                latency = round((time.time() - t0) * 1000)
                print(f"[PLAY OK] \"{s['title']}\" -> {len(data)} bytes received in {latency}ms")
                success_count += 1
        except Exception as e:
            print(f"[PLAY ERROR] \"{s['title']}\" -> {e}")

    print(f"\nResult: {success_count}/{len(songs)} songs verified and ready to play smoothly!")

if __name__ == "__main__":
    test_playback()
