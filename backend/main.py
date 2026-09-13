import sys
import os
import time
import socket
import asyncio
import requests
from typing import Optional, Dict, Any

# Ensure backend directory is in sys.path for cloud deployment
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

try:
    from backend.extractor import extract_instagram_audio, CACHE_DIR
    from backend.trending import get_trending_songs, get_artists, get_albums
    from backend.search import search_full_songs, get_full_song_stream, get_search_suggestions, get_category_songs
    from backend.rooms import room_manager
except ImportError:
    from extractor import extract_instagram_audio, CACHE_DIR
    from trending import get_trending_songs, get_artists, get_albums
    from search import search_full_songs, get_full_song_stream, get_search_suggestions, get_category_songs
    from rooms import room_manager

app = FastAPI(title="My Music Pro API", version="3.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

# Serve audio cache files
os.makedirs(CACHE_DIR, exist_ok=True)
app.mount("/api/audio", StaticFiles(directory=CACHE_DIR), name="audio")

class ExtractRequest(BaseModel):
    url: str

@app.get("/api/local-ip")
def local_ip_endpoint():
    return {"ip": get_local_ip()}

@app.get("/api/trending")
def trending():
    return {"success": True, "songs": get_trending_songs()}

@app.get("/api/artists")
def artists_endpoint():
    return {"success": True, "artists": get_artists()}

@app.get("/api/albums")
def albums_endpoint():
    return {"success": True, "albums": get_albums()}

@app.get("/api/artist/{name}")
def artist_songs_endpoint(name: str):
    name_clean = name.strip().lower()
    # Find matching artist
    all_artists = get_artists()
    found_art = next((a for a in all_artists if name_clean in a['name'].lower()), None)
    
    # Query songs
    songs = search_full_songs(f"{name} best songs", limit=20)
    return {
        "success": True,
        "artist": found_art or {"name": name, "role": "Artist", "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400"},
        "songs": songs
    }

@app.get("/api/album/{name}")
def album_songs_endpoint(name: str):
    name_clean = name.strip().lower()
    all_albums = get_albums()
    found_alb = next((a for a in all_albums if name_clean in a['title'].lower()), None)
    
    songs = search_full_songs(f"{name} album songs", limit=15)
    return {
        "success": True,
        "album": found_alb or {"title": name, "artist": "Various Artists", "image": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400"},
        "songs": songs
    }

@app.get("/api/category/{category_name}")
def category_endpoint(category_name: str, limit: int = 30):
    songs = get_category_songs(category_name, limit=limit)
    return {"success": True, "category": category_name, "count": len(songs), "songs": songs}

@app.get("/api/suggestions")
def suggestions_endpoint(q: str = Query(..., description="Query for suggestions")):
    return {"success": True, "suggestions": get_search_suggestions(q)}

@app.get("/api/search")
def search_songs(q: str = Query(..., description="Song or artist name"), limit: int = 30):
    if not q.strip():
        return {"success": True, "songs": []}
    results = search_full_songs(q.strip(), limit=limit)
    return {"success": True, "songs": results}

@app.get("/api/song-stream/{video_id}")
def song_stream(video_id: str):
    data = get_full_song_stream(video_id)
    if not data.get("success"):
        raise HTTPException(status_code=500, detail=data.get("error", "Failed to retrieve song stream"))
    return data

@app.get("/api/stream-audio/{video_id}")
def stream_audio(video_id: str, request: Request):
    target_url = None

    # Check if cached audio file in CACHE_DIR
    possible_file = os.path.join(CACHE_DIR, f"{video_id}.mp3")
    if os.path.exists(possible_file):
        return FileResponse(possible_file, media_type="audio/mpeg")

    all_trending = get_trending_songs()
    found_local = next((s for s in all_trending if s["id"] == video_id), None)
    
    if found_local and found_local.get("youtube_id"):
        real_vid = found_local["youtube_id"]
        stream_info = get_full_song_stream(real_vid)
        if stream_info.get("success") and stream_info.get("audio_url"):
            target_url = stream_info["audio_url"]
    elif found_local and found_local.get("audio_url") and found_local["audio_url"].startswith("http"):
        target_url = found_local["audio_url"]
    else:
        stream_info = get_full_song_stream(video_id)
        if stream_info.get("success") and stream_info.get("audio_url"):
            target_url = stream_info["audio_url"]

    if not target_url or not target_url.startswith("http"):
        raise HTTPException(status_code=404, detail="Audio stream not found")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    try:
        req = requests.get(target_url, headers=headers, stream=True, timeout=25)
        
        def iter_file():
            for chunk in req.iter_content(chunk_size=64 * 1024):
                if chunk:
                    yield chunk

        resp_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": req.headers.get("Content-Type", "audio/mpeg"),
        }
        if "Content-Length" in req.headers:
            resp_headers["Content-Length"] = req.headers["Content-Length"]
        if "Content-Range" in req.headers:
            resp_headers["Content-Range"] = req.headers["Content-Range"]

        status_code = req.status_code if req.status_code in (200, 206) else 200
        return StreamingResponse(iter_file(), status_code=status_code, headers=resp_headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming error: {str(e)}")

@app.post("/api/extract")
def extract(req: ExtractRequest):
    if not req.url or "instagram.com" not in req.url:
        raise HTTPException(status_code=400, detail="Please enter a valid Instagram URL.")
    
    result = extract_instagram_audio(req.url)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to extract audio"))
    
    return result

# ==================== MUSIC ROOM (LISTEN TOGETHER) ====================
class CreateRoomRequest(BaseModel):
    host_name: str
    client_id: str
    initial_song: Optional[Dict[str, Any]] = None

@app.on_event("startup")
async def startup_event():
    # Start periodic room sync loop
    asyncio.create_task(room_manager.periodic_sync_loop())

@app.post("/api/room/create")
def create_room_endpoint(req: CreateRoomRequest):
    room = room_manager.create_room(
        host_id=req.client_id,
        host_name=req.host_name.strip() if req.host_name else "Host",
        initial_song=req.initial_song
    )
    return {
        "success": True,
        "room_code": room.code,
        "room_state": room.to_dict()
    }

@app.get("/api/rooms/active")
def get_active_rooms_endpoint():
    rooms = room_manager.get_active_rooms()
    return {
        "success": True,
        "rooms": rooms
    }

@app.get("/api/room/{code}")
def get_room_endpoint(code: str):
    room = room_manager.get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Music Room not found or has expired. Please check the code or ask the Host for an invite link.")
    return {
        "success": True,
        "room": room.to_dict()
    }

@app.websocket("/ws/room/{room_code}")
async def room_websocket(websocket: WebSocket, room_code: str):
    await websocket.accept()
    room = room_manager.get_room(room_code)
    if not room:
        await websocket.send_json({"event": "ERROR", "data": {"message": "Room not found"}})
        await websocket.close()
        return

    client_id = None
    client_name = "Listener"
    try:
        # First message from client must be JOIN
        join_msg = await websocket.receive_json()
        if join_msg.get("event") != "JOIN":
            await websocket.close()
            return

        client_id = join_msg.get("client_id") or f"user_{int(time.time()*1000)}"
        client_name = join_msg.get("name") or "Listener"
        is_host = (client_id == room.host_id)

        # Register member
        room.members[client_id] = {
            "id": client_id,
            "name": client_name,
            "is_host": is_host,
            "status": "listening",
            "joined_at": time.time()
        }
        room.add_connection(client_id, websocket)

        # Send full room state to the newly joined client
        await websocket.send_json({
            "event": "ROOM_STATE",
            "room_code": room.code,
            "server_time": int(time.time() * 1000),
            "data": room.to_dict()
        })

        # Broadcast member joined to others
        await room.broadcast("MEMBER_JOINED", {
            "member": room.members[client_id],
            "member_count": len(room.members)
        }, exclude_client_id=client_id)

        # WebSocket Message Pump
        while True:
            data = await websocket.receive_json()
            event = data.get("event")
            payload = data.get("data", {})
            now = time.time()
            now_ms = int(now * 1000)

            # Check if this sender is host
            sender_is_host = (client_id == room.host_id)

            if event == "PLAY":
                pos = float(payload.get("position", room.get_current_position()))
                room.is_playing = True
                room.position = pos
                room.last_updated = now
                if "song" in payload and payload["song"]:
                    room.current_song = payload["song"]
                await room.broadcast("PLAY_SYNC", {
                    "song": room.current_song,
                    "position": round(pos, 2),
                    "server_time": now_ms
                })

            elif event == "PAUSE":
                pos = float(payload.get("position", room.get_current_position()))
                room.is_playing = False
                room.position = pos
                room.last_updated = now
                await room.broadcast("PAUSE_SYNC", {
                    "position": round(pos, 2),
                    "server_time": now_ms
                })

            elif event == "SEEK":
                pos = float(payload.get("position", 0.0))
                room.position = pos
                room.last_updated = now
                await room.broadcast("SEEK_SYNC", {
                    "position": round(pos, 2),
                    "is_playing": room.is_playing,
                    "server_time": now_ms
                })

            elif event == "CHANGE_SONG":
                new_song = payload.get("song")
                if new_song:
                    room.current_song = new_song
                    room.position = 0.0
                    room.is_playing = True
                    room.last_updated = now
                    await room.broadcast("SONG_CHANGED", {
                        "song": new_song,
                        "position": 0.0,
                        "is_playing": True,
                        "server_time": now_ms
                    })

            elif event == "NEXT":
                if room.queue:
                    next_song = room.queue.pop(0)
                    room.current_song = next_song
                    room.position = 0.0
                    room.is_playing = True
                    room.last_updated = now
                    await room.broadcast("SONG_CHANGED", {
                        "song": next_song,
                        "position": 0.0,
                        "is_playing": True,
                        "queue": room.queue,
                        "server_time": now_ms
                    })

            elif event == "QUEUE_ADD":
                song_to_add = payload.get("song")
                if song_to_add:
                    room.queue.append(song_to_add)
                    await room.broadcast("QUEUE_SYNC", {
                        "queue": room.queue
                    })

            elif event == "QUEUE_REMOVE":
                idx = payload.get("index")
                if idx is not None and 0 <= idx < len(room.queue):
                    room.queue.pop(idx)
                    await room.broadcast("QUEUE_SYNC", {
                        "queue": room.queue
                    })

            elif event == "SHUFFLE_TOGGLE":
                room.shuffle = not room.shuffle
                await room.broadcast("SHUFFLE_SYNC", {
                    "shuffle": room.shuffle
                })

            elif event == "REPEAT_TOGGLE":
                modes = ["off", "one", "all"]
                curr_idx = modes.index(room.repeat) if room.repeat in modes else 0
                room.repeat = modes[(curr_idx + 1) % len(modes)]
                await room.broadcast("REPEAT_SYNC", {
                    "repeat": room.repeat
                })

            elif event == "STATUS_UPDATE":
                # Member status (e.g. listening / paused)
                st = payload.get("status")
                if st and client_id in room.members:
                    room.members[client_id]["status"] = st
                    await room.broadcast("MEMBER_STATUS", {
                        "member_id": client_id,
                        "status": st
                    }, exclude_client_id=client_id)

            elif event in ("CHAT_MSG", "CHAT"):
                text = (payload.get("text") or payload.get("message") or "").strip()
                if text:
                    sender = payload.get("sender_name") or client_name
                    msg_obj = {
                        "sender": sender,
                        "is_host": sender_is_host,
                        "text": text[:200],
                        "time": time.strftime("%H:%M")
                    }
                    room.chat_messages.append(msg_obj)
                    if len(room.chat_messages) > 40:
                        room.chat_messages.pop(0)
                    await room.broadcast("CHAT_BROADCAST", msg_obj)

            elif event in ("REACTION", "EMOJI"):
                reaction = payload.get("reaction") or payload.get("emoji")
                if reaction:
                    sender = payload.get("sender_name") or client_name
                    await room.broadcast("REACTION_BROADCAST", {
                        "sender": sender,
                        "reaction": reaction
                    })

            elif event in ("LEAVE_ROOM", "LEAVE"):
                new_host = room.remove_member(client_id)
                if len(room.members) == 0:
                    room_manager.remove_room(room.code)
                else:
                    await room.broadcast("MEMBER_LEFT", {
                        "member_id": client_id,
                        "member_count": len(room.members),
                        "new_host_id": new_host,
                        "new_host_name": room.host_name if new_host else None
                    })
                break

            elif event == "KICK_MEMBER":
                # Only Host can kick
                if sender_is_host:
                    target_id = payload.get("target_id")
                    if target_id and target_id in room.members and target_id != room.host_id:
                        kicked_ws = room.connections.get(target_id)
                        if kicked_ws:
                            try:
                                await kicked_ws.send_json({"event": "KICKED", "data": {"message": "You were removed from the room by the host."}})
                                await kicked_ws.close()
                            except Exception:
                                pass
                        room.remove_member(target_id)
                        await room.broadcast("MEMBER_LEFT", {
                            "member_id": target_id,
                            "member_count": len(room.members)
                        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print("WS exception:", e)
    finally:
        if client_id:
            room.remove_connection(client_id)
            if client_id in room.members:
                room.members[client_id]["status"] = "offline"
                await room.broadcast("MEMBER_STATUS", {
                    "member_id": client_id,
                    "status": "offline"
                })

# Serve Frontend static assets
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "online", "message": "My Music backend is running"}

@app.get("/{file_name:path}")
def serve_frontend_files(file_name: str):
    file_path = os.path.join(FRONTEND_DIR, file_name)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"detail": "Not found"}

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    import uvicorn
    local_ip = get_local_ip()
    print("========================================================")
    print("My Music Pro is running!")
    print(f"Open on your Computer: http://localhost:8000")
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
