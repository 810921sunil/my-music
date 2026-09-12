# 🎵 InstaSound - Instagram Songs Mobile App

An Android-ready mobile application that lets you play audio and songs directly from Instagram Reels, with a built-in library of trending viral sounds and full playback controls.

---

## 📱 How to Run and Use on Your Android Phone

1. **Start the App Server:**
   - Double-click **`start_app.bat`** (or run `python backend/main.py` in terminal).
2. **Open on your Computer:**
   - Go to: **[http://localhost:8000](http://localhost:8000)**
3. **Open on your Android Phone:**
   - Connect your phone to the same Wi-Fi network as your computer.
   - Click the **"Phone"** QR code button at the top-right of the app, or open Chrome on your phone and type:
     ```
     http://192.168.211.233:8000
     ```
4. **Install as Native Android App:**
   - In Chrome on your phone, tap the **3 dots (Menu)** at top-right.
   - Tap **"Add to Home screen"** or **"Install app"**.
   - InstaSound will be installed with its own app icon on your phone!

---

## ✨ Features

- 🎧 **Instagram Reel Audio Extractor:** Paste any Instagram Reel, Video, or Audio link to extract and stream its audio.
- 🎵 **Trending Viral Reels Library:** Curated, ready-to-play viral Instagram songs updated with album covers and artist names.
- 💽 **Sleek Music Player:** 
  - Spinning vinyl disc & album art.
  - Interactive seekbar and timer.
  - Loop mode, playback speed controls (0.75x to 2x), volume control.
  - Sticky bottom mini player.
- 📥 **Download MP3:** Save any extracted audio track directly to your device.
- 📜 **Local History & Playlist:** Remembers all your played and extracted tracks so you can replay them anytime offline.
- 📲 **Background Playback:** Continues playing audio even when your phone screen is locked or while multitasking (via Android MediaSession API).

---

## 📁 Project Structure

```
Instagaram songs/
│
├── backend/
│   ├── main.py          # FastAPI server & static file host
│   ├── extractor.py     # Instagram audio extractor using yt-dlp
│   ├── trending.py      # Curated viral reels music database
│   └── audio_cache/     # Cache storage for extracted audio files
│
├── frontend/
│   ├── index.html       # Mobile-optimized player interface
│   ├── style.css        # Instagram dark-theme styling
│   ├── app.js           # Audio engine, extractor client & controls
│   └── manifest.json    # Android PWA install configuration
│
├── start_app.bat        # One-click Windows starter script
└── README.md
```
