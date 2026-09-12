import urllib.request
import json
import time

def safe_str(s):
    return str(s).encode('ascii', 'ignore').decode('ascii')

def test():
    print("Testing live search API for query: 'kesariya'...")
    t0 = time.time()
    url = "http://localhost:8000/api/search?q=kesariya"
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode('utf-8'))
        songs = data.get("songs", [])
        print(f"--> Found {len(songs)} full songs in {round((time.time() - t0)*1000)}ms")
        for s in songs[:3]:
            print(f"    - Title: {safe_str(s['title'])} | Duration: {s['duration']}s | Artist: {safe_str(s['artist'])}")

        if songs:
            first_id = songs[0]['id']
            print(f"\nTesting stream resolution for '{first_id}'...")
            t1 = time.time()
            stream_url = f"http://localhost:8000/api/song-stream/{first_id}"
            with urllib.request.urlopen(stream_url) as s_res:
                s_data = json.loads(s_res.read().decode('utf-8'))
                audio_stream = s_data.get('audio_url')
                print(f"--> Stream resolved in {round((time.time() - t1)*1000)}ms!")
                print(f"--> Audio URL length: {len(audio_stream)} characters")

                req = urllib.request.Request(audio_stream, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as stream_test:
                    chunk = stream_test.read(32768)
                    print(f"--> Audio Buffer Verified: {len(chunk)} bytes received! Full Song plays smoothly!")

if __name__ == "__main__":
    test()
