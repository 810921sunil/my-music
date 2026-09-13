import os
import urllib.request
import urllib.parse
import json
import hashlib
from typing import List, Dict, Any
import yt_dlp

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
    "trending": "top trending viral songs bollywood 2026 audio",
    "romantic": "best romantic love songs arijit singh bollywood audio",
    "party": "best party dance club dj hits bollywood punjabi audio",
    "chill": "lofi chill aesthetic acoustic songs hindi english audio",
    "workout": "high energy gym workout motivation songs audio",
    "sad": "sad emotional heartbroken songs arijit b praak audio"
}

def get_search_suggestions(query: str) -> List[str]:
    query = query.strip()
    if not query or len(query) < 2:
        return []
    
    url = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode('utf-8'))
            suggestions = data[1] if len(data) > 1 else []
            clean_suggestions = []
            for s in suggestions:
                s_clean = s.strip()
                if s_clean and s_clean not in clean_suggestions:
                    clean_suggestions.append(s_clean)
                if len(clean_suggestions) >= 8:
                    break
            return clean_suggestions
    except Exception as e:
        print(f"Suggestion error: {e}")
        return []

def search_full_songs(query: str, limit: int = 30) -> List[Dict[str, Any]]:
    query = query.strip()
    if not query:
        return []

    search_term = f"ytsearch{limit}:{query} audio"
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'noplaylist': True,
    }

    results = []
    seen_ids = set()
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            data = ydl.extract_info(search_term, download=False)
            entries = data.get('entries', [])
            for entry in entries:
                if not entry:
                    continue
                vid_id = entry.get('id')
                if not vid_id or vid_id in seen_ids:
                    continue
                seen_ids.add(vid_id)

                title = entry.get('title', 'Unknown Track')
                clean_title = (
                    title.replace("(Official Audio)", "")
                         .replace("(Official Video)", "")
                         .replace("[Official Audio]", "")
                         .replace("(Full Song)", "")
                         .replace("[Full Song]", "")
                         .replace("| Full Audio |", "")
                         .strip()
                )
                uploader = entry.get('uploader') or entry.get('channel') or 'Artist'
                duration = entry.get('duration') or 210
                
                thumbnails = entry.get('thumbnails', [])
                thumbnail = thumbnails[-1].get('url') if thumbnails else f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"

                results.append({
                    "id": vid_id,
                    "title": clean_title,
                    "artist": uploader,
                    "duration": duration,
                    "thumbnail": thumbnail,
                    "audio_url": f"/api/stream-audio/{vid_id}",
                    "is_full_song": True
                })
    except Exception as e:
        print(f"Search error: {e}")

    return results

def get_category_songs(category_name: str, limit: int = 30) -> List[Dict[str, Any]]:
    cat_key = category_name.strip().lower()
    if cat_key in _CATEGORY_CACHE and len(_CATEGORY_CACHE[cat_key]) >= 15:
        return _CATEGORY_CACHE[cat_key]

    query = CATEGORY_QUERIES.get(cat_key, f"{category_name} top hits songs audio")
    songs = search_full_songs(query, limit=limit)
    if songs:
        _CATEGORY_CACHE[cat_key] = songs
    return songs

def get_full_song_stream(video_id: str) -> Dict[str, Any]:
    if not video_id:
        return {"success": False, "error": "Empty video ID"}

    if video_id in _STREAM_CACHE:
        return _STREAM_CACHE[video_id]

    target_target = video_id
    if not target_target.startswith("http"):
        target_target = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'ffmpeg_location': FFMPEG_EXE,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_target, download=False)
            audio_url = info.get('url')
            title = info.get('title', 'Full Song')
            uploader = info.get('uploader', 'Artist')
            thumbnail = info.get('thumbnail', f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg")
            duration = info.get('duration', 180)

            if not audio_url:
                raise Exception("yt_dlp returned empty audio URL")

            result = {
                "success": True,
                "id": video_id,
                "title": title,
                "artist": uploader,
                "thumbnail": thumbnail,
                "duration": duration,
                "audio_url": audio_url
            }
            _STREAM_CACHE[video_id] = result
            return result
    except Exception as e:
        print(f"Error extracting stream for {video_id}: {e}")
        return {
            "success": False,
            "error": f"Failed to get audio stream: {str(e)}"
        }
