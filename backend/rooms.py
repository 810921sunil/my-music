import time
import string
import random
import asyncio
from typing import Dict, List, Optional, Any
from fastapi import WebSocket

def generate_room_code() -> str:
    """Generate a clean 6-character alphanumeric room code (e.g. M7K9X2)"""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" # Exclude similar chars like I, 1, O, 0
    return "".join(random.choices(chars, k=6))

class Room:
    def __init__(self, code: str, host_id: str, host_name: str, initial_song: Optional[Dict[str, Any]] = None):
        self.code = code
        self.host_id = host_id
        self.host_name = host_name
        self.created_at = time.time()
        
        # Members: client_id -> { name, is_host, status, joined_at }
        self.members: Dict[str, Dict[str, Any]] = {
            host_id: {
                "id": host_id,
                "name": host_name,
                "is_host": True,
                "status": "listening",
                "joined_at": time.time()
            }
        }
        
        # WebSocket Connections: client_id -> WebSocket
        self.connections: Dict[str, WebSocket] = {}
        
        # Playback State
        self.current_song: Optional[Dict[str, Any]] = initial_song
        self.is_playing: bool = False
        self.position: float = 0.0
        self.last_updated: float = time.time()
        
        # Queue & Options
        self.queue: List[Dict[str, Any]] = []
        self.shuffle: bool = False
        self.repeat: str = "off" # "off", "one", "all"
        
        # In-Room Chat & Reactions
        self.chat_messages: List[Dict[str, Any]] = []

    def get_current_position(self) -> float:
        """Calculate live elapsed playback position."""
        if not self.is_playing:
            return self.position
        elapsed = time.time() - self.last_updated
        pos = self.position + elapsed
        if self.current_song and self.current_song.get("duration"):
            try:
                dur = float(self.current_song["duration"])
                if dur > 0 and pos > dur:
                    return dur
            except (ValueError, TypeError):
                pass
        return max(0.0, pos)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize current room state for client consumption."""
        return {
            "code": self.code,
            "host_id": self.host_id,
            "host_name": self.host_name,
            "members": list(self.members.values()),
            "member_count": len(self.members),
            "current_song": self.current_song,
            "is_playing": self.is_playing,
            "position": round(self.get_current_position(), 2),
            "server_time": int(time.time() * 1000),
            "queue": self.queue,
            "shuffle": self.shuffle,
            "repeat": self.repeat,
            "chat_messages": self.chat_messages[-30:]
        }

    async def broadcast(self, event: str, payload: Dict[str, Any], exclude_client_id: Optional[str] = None):
        """Send real-time JSON message to all connected members."""
        message = {
            "event": event,
            "room_code": self.code,
            "server_time": int(time.time() * 1000),
            "data": payload
        }
        dead_connections = []
        for cid, ws in self.connections.items():
            if exclude_client_id and cid == exclude_client_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.append(cid)
        
        for cid in dead_connections:
            self.remove_connection(cid)

    def add_connection(self, client_id: str, ws: WebSocket):
        self.connections[client_id] = ws

    def remove_connection(self, client_id: str):
        if client_id in self.connections:
            del self.connections[client_id]

    def remove_member(self, client_id: str) -> Optional[str]:
        """Remove member. If host leaves, assign next member as new host."""
        if client_id in self.members:
            del self.members[client_id]
        self.remove_connection(client_id)
        
        new_host_id = None
        if client_id == self.host_id and len(self.members) > 0:
            next_member = next(iter(self.members.values()))
            self.host_id = next_member["id"]
            self.host_name = next_member["name"]
            next_member["is_host"] = True
            new_host_id = self.host_id
        return new_host_id

import os
import json

ROOM_STORAGE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "active_rooms.json")

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.load_from_disk()

    def _normalize_code(self, code: str) -> str:
        if not code:
            return ""
        c = code.strip()
        if "room=" in c:
            c = c.split("room=")[1].split("&")[0]
        # Keep only alphanumeric
        return "".join(ch for ch in c if ch.isalnum()).upper()[:6]

    def save_to_disk(self):
        try:
            data = {}
            now = time.time()
            for code, room in self.rooms.items():
                # Save rooms created within last 24 hours
                if now - room.created_at < 86400:
                    data[code] = {
                        "code": room.code,
                        "host_id": room.host_id,
                        "host_name": room.host_name,
                        "created_at": room.created_at,
                        "current_song": room.current_song,
                        "is_playing": room.is_playing,
                        "position": room.position,
                        "last_updated": room.last_updated,
                        "queue": room.queue,
                        "members": room.members
                    }
            with open(ROOM_STORAGE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as e:
            print("[RoomManager] Error saving to disk:", e)

    def load_from_disk(self):
        if not os.path.exists(ROOM_STORAGE_FILE):
            return
        try:
            with open(ROOM_STORAGE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            now = time.time()
            for code, rdata in data.items():
                if now - rdata.get("created_at", 0) < 86400:
                    room = Room(
                        code=rdata["code"],
                        host_id=rdata["host_id"],
                        host_name=rdata["host_name"],
                        initial_song=rdata.get("current_song")
                    )
                    room.created_at = rdata.get("created_at", room.created_at)
                    room.is_playing = rdata.get("is_playing", False)
                    room.position = rdata.get("position", 0.0)
                    room.queue = rdata.get("queue", [])
                    room.members = rdata.get("members", room.members)
                    self.rooms[room.code] = room
            print(f"[RoomManager] Restored {len(self.rooms)} rooms from disk.")
        except Exception as e:
            print("[RoomManager] Error loading from disk:", e)

    def create_room(self, host_id: str, host_name: str, initial_song: Optional[Dict[str, Any]] = None) -> Room:
        code = generate_room_code()
        while code in self.rooms:
            code = generate_room_code()
        
        room = Room(code=code, host_id=host_id, host_name=host_name, initial_song=initial_song)
        self.rooms[code] = room
        self.save_to_disk()
        return room

    def get_room(self, code: str) -> Optional[Room]:
        norm = self._normalize_code(code)
        if not norm:
            return None
        return self.rooms.get(norm)

    def remove_room(self, code: str):
        norm = self._normalize_code(code)
        if norm in self.rooms:
            del self.rooms[norm]
            self.save_to_disk()

    def get_active_rooms(self) -> List[Dict[str, Any]]:
        """Return list of public active rooms for easy 1-click joining."""
        now = time.time()
        result = []
        for room in self.rooms.values():
            # Check if room is within last 12 hours
            if now - room.created_at < 43200:
                result.append({
                    "code": room.code,
                    "host_name": room.host_name,
                    "member_count": max(1, len(room.members)),
                    "current_song": room.current_song,
                    "is_playing": room.is_playing,
                    "created_at": int(room.created_at)
                })
        # Sort by most recent
        result.sort(key=lambda r: r.get("created_at", 0), reverse=True)
        return result

    async def periodic_sync_loop(self):
        """Background heartbeat keeping playing rooms perfectly synchronized with sub-second precision."""
        save_counter = 0
        while True:
            try:
                await asyncio.sleep(1.5)
                now_ms = int(time.time() * 1000)
                for room in list(self.rooms.values()):
                    if room.is_playing and room.connections:
                        await room.broadcast("PERIODIC_SYNC", {
                            "position": round(room.get_current_position(), 2),
                            "is_playing": True,
                            "server_time": now_ms
                        }, exclude_client_id=room.host_id)
                save_counter += 1
                if save_counter >= 30: # Save state every ~45 seconds
                    save_counter = 0
                    self.save_to_disk()
            except Exception as e:
                print("Sync loop exception:", e)

room_manager = RoomManager()
