import os
import urllib.request
import urllib.parse
import json
import hashlib
import base64
import requests
from typing import List, Dict, Any
from Crypto.Cipher import DES

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    import shutil
    FFMPEG_EXE = shutil.which("ffmpeg") or "ffmpeg"

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

_STREAM_CACHE = {}
_CATEGORY_CACHE = {}

CATEGORY_QUERIES = {
    "trending": "Top Trending Bollywood 2026",
    "romantic": "Best Romantic Songs Arijit Singh",
    "party": "Best Party Dance Hits Punjabi",
    "chill": "Lo-Fi Aesthetic Acoustic Songs Hindi",
    "workout": "High Energy Workout Motivation Hits",
    "sad": "Sad Emotional Heartbreak Songs"
}

def decrypt_saavn_url(encrypted_url: str) -> str:
    try:
        key = b'38346591'
        enc = base64.b64decode(encrypted_url.strip())
        cipher = DES.new(key, DES.MODE_ECB)
        decrypted = cipher.decrypt(enc)
        pad = decrypted[-1]
        url = decrypted[:-pad].decode('utf-8')
        # Upgrade to 320kbps MP4/AAC stream
        return url.replace('_96.mp4', '_320.mp4')
    except Exception as e:
        print(f"Decryption error: {e}")
        return ""

def get_search_suggestions(query: str) -> List[str]:
    query = query.strip()
    if not query or len(query) < 2:
        return []
    
    url = f"https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query={urllib.parse.quote(query)}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        r = requests.get(url, headers=headers, timeout=3)
        if r.status_code == 200:
            data = r.json()
            songs = data.get("songs", {}).get("data", [])
            suggestions = []
            for s in songs:
                title = s.get("title", "").replace("&quot;", '"').replace("&amp;", "&")
                if title and title not in suggestions:
                    suggestions.append(title)
                if len(suggestions) >= 8:
                    break
            if suggestions:
                return suggestions
    except Exception as e:
        print(f"Suggestion error: {e}")

    # Fallback to Google suggest
    try:
        gurl = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={urllib.parse.quote(query)}"
        req = urllib.request.Request(gurl, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode('utf-8'))
            suggestions = data[1] if len(data) > 1 else []
            return [s.strip() for s in suggestions if s.strip()][:8]
    except Exception:
        return []

def search_full_songs(query: str, limit: int = 30) -> List[Dict[str, Any]]:
    query = query.strip()
    if not query:
        return []

    # Primary: Fast JioSaavn 320kbps catalog (No cloud blocks)
    url = f"https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&p=1&n={limit}&q={urllib.parse.quote(query)}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            results_raw = data.get("results", [])
            results = []
            seen_ids = set()
            for item in results_raw:
                sid = item.get("id") or item.get("perma_url")
                if not sid or sid in seen_ids:
                    continue
                seen_ids.add(sid)

                enc = item.get("encrypted_media_url")
                direct_url = decrypt_saavn_url(enc) if enc else item.get("media_preview_url", "")
                
                title = (
                    item.get("song", "Unknown Track")
                    .replace("&quot;", '"')
                    .replace("&amp;", "&")
                    .replace("&#039;", "'")
                )
                artist = (
                    item.get("singers") or item.get("primary_artists") or "Artist"
                ).replace("&quot;", '"').replace("&amp;", "&").replace("&#039;", "'")

                thumb = (item.get("image") or "").replace("150x150", "500x500").replace("50x50", "500x500")
                if not thumb:
                    thumb = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500"

                duration = int(item.get("duration", 210))

                song_obj = {
                    "id": str(sid),
                    "title": title,
                    "artist": artist,
                    "duration": duration,
                    "thumbnail": thumb,
                    "audio_url": direct_url or f"/api/stream-audio/{sid}",
                    "is_full_song": True
                }

                if direct_url:
                    _STREAM_CACHE[str(sid)] = {
                        "success": True,
                        "id": str(sid),
                        "title": title,
                        "artist": artist,
                        "thumbnail": thumb,
                        "duration": duration,
                        "audio_url": direct_url
                    }

                results.append(song_obj)

            if results:
                return results
    except Exception as e:
        print(f"Saavn search error: {e}")

    return []

def get_category_songs(category_name: str, limit: int = 30) -> List[Dict[str, Any]]:
    cat_key = category_name.strip().lower()
    if cat_key in _CATEGORY_CACHE and len(_CATEGORY_CACHE[cat_key]) >= 10:
        return _CATEGORY_CACHE[cat_key]

    query = CATEGORY_QUERIES.get(cat_key, f"{category_name} songs")
    songs = search_full_songs(query, limit=limit)
    if songs:
        _CATEGORY_CACHE[cat_key] = songs
    return songs

def get_full_song_stream(video_id: str) -> Dict[str, Any]:
    if not video_id:
        return {"success": False, "error": "Empty video ID"}

    sid = str(video_id).strip()

    if sid in _STREAM_CACHE:
        return _STREAM_CACHE[sid]

    # Search Saavn by song ID or query
    url = f"https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&pids={urllib.parse.quote(sid)}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            song_data = data.get(sid) or (list(data.values())[0] if data else None)
            if song_data and isinstance(song_data, dict):
                enc = song_data.get("encrypted_media_url")
                direct_url = decrypt_saavn_url(enc) if enc else song_data.get("media_preview_url", "")
                if direct_url:
                    res = {
                        "success": True,
                        "id": sid,
                        "title": song_data.get("song", "Song"),
                        "artist": song_data.get("singers") or song_data.get("primary_artists") or "Artist",
                        "thumbnail": (song_data.get("image") or "").replace("150x150", "500x500"),
                        "duration": int(song_data.get("duration", 200)),
                        "audio_url": direct_url
                    }
                    _STREAM_CACHE[sid] = res
                    return res
    except Exception as e:
        print(f"Saavn song.getDetails error for {sid}: {e}")

    # If sid is a search title
    search_res = search_full_songs(sid, limit=1)
    if search_res and search_res[0].get("audio_url") and search_res[0]["audio_url"].startswith("http"):
        s0 = search_res[0]
        res = {
            "success": True,
            "id": sid,
            "title": s0.get("title"),
            "artist": s0.get("artist"),
            "thumbnail": s0.get("thumbnail"),
            "duration": s0.get("duration", 200),
            "audio_url": s0["audio_url"]
        }
        _STREAM_CACHE[sid] = res
        return res

    return {
        "success": False,
        "error": f"Audio stream not found for {sid}"
    }
