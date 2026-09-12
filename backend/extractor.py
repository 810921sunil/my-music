import os
import re
import hashlib
from typing import Optional, Dict, Any
import yt_dlp
import imageio_ffmpeg

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

def get_url_hash(url: str) -> str:
    return hashlib.md5(url.strip().encode("utf-8")).hexdigest()[:12]

def clean_instagram_url(url: str) -> str:
    url = url.strip()
    match = re.search(r'(https?://(?:www\.)?instagram\.com/(?:reel|p|tv)/[A-Za-z0-9_-]+)', url)
    if match:
        return match.group(1) + "/"
    return url

def extract_instagram_audio(url: str) -> Dict[str, Any]:
    clean_url = clean_instagram_url(url)
    url_hash = get_url_hash(clean_url)
    output_filename = f"{url_hash}.mp3"
    output_path = os.path.join(CACHE_DIR, output_filename)

    # Return cached if already downloaded
    if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
        return {
            "success": True,
            "cached": True,
            "id": url_hash,
            "title": "Instagram Audio",
            "uploader": "Instagram Creator",
            "thumbnail": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500",
            "file_path": output_path,
            "audio_url": f"/api/audio/{output_filename}"
        }

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(CACHE_DIR, f"{url_hash}.%(ext)s"),
        'ffmpeg_location': FFMPEG_EXE,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'noplaylist': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=True)
            title = info.get('title') or (info.get('description', '')[:50] if info.get('description') else 'Instagram Reel Audio')
            uploader = info.get('uploader') or info.get('uploader_id') or 'Instagram Artist'
            thumbnail = info.get('thumbnail') or 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500'
            duration = info.get('duration') or 30

            final_file = output_path
            if not os.path.exists(final_file):
                for f in os.listdir(CACHE_DIR):
                    if f.startswith(url_hash):
                        final_file = os.path.join(CACHE_DIR, f)
                        output_filename = f
                        break

            return {
                "success": True,
                "id": url_hash,
                "title": title.strip() if title else "Instagram Reel Audio",
                "uploader": uploader,
                "thumbnail": thumbnail,
                "duration": duration,
                "audio_url": f"/api/audio/{output_filename}",
                "file_path": final_file
            }
    except Exception as e:
        # Fallback: extract direct stream URL without local download
        try:
            stream_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'ffmpeg_location': FFMPEG_EXE
            }
            with yt_dlp.YoutubeDL(stream_opts) as ydl_stream:
                info = ydl_stream.extract_info(clean_url, download=False)
                return {
                    "success": True,
                    "id": url_hash,
                    "title": info.get('title', 'Instagram Reel Audio')[:50],
                    "uploader": info.get('uploader', 'Instagram Creator'),
                    "thumbnail": info.get('thumbnail', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500'),
                    "duration": info.get('duration', 30),
                    "audio_url": info.get('url'),
                    "is_direct_stream": True
                }
        except Exception as err:
            return {
                "success": False,
                "error": f"Extraction failed: {str(e)} | {str(err)}"
            }
