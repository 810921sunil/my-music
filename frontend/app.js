// ========================================================
// MY MUSIC - FEEL THE MUSIC (FRONTEND CONTROLLER)
// Complete Robust Implementation - Explicit Play, Song Registry, Streaming Proxy
// ========================================================

// Application State
// Unique client ID per browser tab to avoid multi-tab collisions
let tabClientId = sessionStorage.getItem('instasound_tab_client_id');
if (!tabClientId) {
    tabClientId = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    sessionStorage.setItem('instasound_tab_client_id', tabClientId);
}

const state = {
    currentSong: null,
    isPlaying: false,
    isLooping: false,
    isShuffled: false,
    autoPlayNext: JSON.parse(localStorage.getItem('instasound_autoplay') ?? 'true'),
    playlist: [],
    currentIndex: -1,
    trendingSongs: [],
    recentSongs: JSON.parse(localStorage.getItem('instasound_recent') || '[]'),
    favorites: JSON.parse(localStorage.getItem('instasound_favs') || '[]'),
    favSongs: JSON.parse(localStorage.getItem('instasound_fav_songs') || '[]'),
    playlists: JSON.parse(localStorage.getItem('instasound_playlists') || '[]'),
    artists: [],
    albums: [],
    theme: localStorage.getItem('instasound_theme') || 'dark',
    contextSong: null,
    currentView: 'home',
    detailQueue: [],
    room: {
        code: null,
        ws: null,
        isHost: false,
        hostId: null,
        hostName: '',
        clientId: tabClientId,
        name: localStorage.getItem('instasound_user_name') || 'Guest',
        members: [],
        queue: [],
        isPlaying: false,
        currentSong: null,
        position: 0,
        isSyncing: false
    }
};

// Global Song Registry: Maps songId -> Song Object
const songMap = new Map();

function registerSong(song) {
    if (!song || !song.id) return song;
    const sid = String(song.id);
    if (!song.audio_url) {
        song.audio_url = `/api/stream-audio/${sid}`;
    }
    songMap.set(sid, song);
    return song;
}

function registerSongs(songs) {
    if (Array.isArray(songs)) {
        songs.forEach(registerSong);
    }
}

// Seed default playlists if empty
if (state.playlists.length === 0) {
    state.playlists = [
        {
            id: 'pl_romantic',
            name: 'Romantic Hits ❤️',
            songs: [
                {
                    id: 'song_apna_bana_le',
                    title: 'Apna Bana Le',
                    artist: 'Arijit Singh',
                    duration: 261,
                    duration_str: '4:21',
                    thumbnail: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=500&q=80',
                    audio_url: '/api/stream-audio/song_apna_bana_le'
                },
                {
                    id: 'song_kesariya',
                    title: 'Kesariya',
                    artist: 'Arijit Singh',
                    duration: 268,
                    duration_str: '4:28',
                    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80',
                    audio_url: '/api/stream-audio/song_kesariya'
                }
            ]
        },
        {
            id: 'pl_party',
            name: 'Party Vibes 🔥',
            songs: [
                {
                    id: 'song_starboy',
                    title: 'Starboy',
                    artist: 'The Weeknd',
                    duration: 230,
                    duration_str: '3:50',
                    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80',
                    audio_url: '/api/stream-audio/song_starboy'
                },
                {
                    id: 'song_shape_of_you',
                    title: 'Shape of You',
                    artist: 'Ed Sheeran',
                    duration: 233,
                    duration_str: '3:53',
                    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80',
                    audio_url: '/api/stream-audio/song_shape_of_you'
                }
            ]
        }
    ];
    localStorage.setItem('instasound_playlists', JSON.stringify(state.playlists));
}

// Pre-register songs from storage
state.recentSongs.forEach(registerSong);
state.favSongs.forEach(registerSong);
state.playlists.forEach(pl => registerSongs(pl.songs));

// DOM Elements
const audio = document.getElementById('audio-engine');
const dashboardScroll = document.getElementById('dashboard-scroll');
const globalSearch = document.getElementById('global-search');
const clearSearchBtn = document.getElementById('clear-search-btn');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');
const userProfileBtn = document.getElementById('user-profile-btn');
const profileMenu = document.getElementById('profile-menu');
const heroPlayBtn = document.getElementById('hero-play-btn');
const toastEl = document.getElementById('toast');

// Views
const views = {
    home: document.getElementById('view-home'),
    search: document.getElementById('view-search'),
    library: document.getElementById('view-library'),
    favourites: document.getElementById('view-favourites'),
    playlists: document.getElementById('view-playlists'),
    recent: document.getElementById('view-recent'),
    trending: document.getElementById('view-trending'),
    artists: document.getElementById('view-artists'),
    albums: document.getElementById('view-albums'),
    detail: document.getElementById('view-detail'),
    settings: document.getElementById('view-settings'),
    room: document.getElementById('view-room')
};

// Bottom Player Controls
const playerThumb = document.getElementById('player-thumb');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const playerFavBtn = document.getElementById('player-fav-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const loopBtn = document.getElementById('loop-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const seekbarTrack = document.getElementById('seekbar-track');
const seekbarFill = document.getElementById('seekbar-fill');
const seekbarThumb = document.getElementById('seekbar-thumb');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const volumeSlider = document.getElementById('volume-slider');
const volumeIconBtn = document.getElementById('volume-icon-btn');
const queueBtn = document.getElementById('queue-btn');
const queueDrawer = document.getElementById('queue-drawer');
const closeQueueBtn = document.getElementById('close-queue-btn');
const clearQueueBtn = document.getElementById('clear-queue-btn');
const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');

// Context Menu & Modals
const songContextMenu = document.getElementById('song-context-menu');
const createPlaylistModal = document.getElementById('create-playlist-modal');
const closeCreatePlaylistBtn = document.getElementById('close-create-playlist-btn');
const cancelPlaylistBtn = document.getElementById('cancel-playlist-btn');
const confirmCreatePlaylistBtn = document.getElementById('confirm-create-playlist-btn');
const playlistNameInput = document.getElementById('playlist-name-input');
const addToPlaylistModal = document.getElementById('add-to-playlist-modal');
const closeAddPlaylistBtn = document.getElementById('close-add-playlist-btn');
const playlistsSelectList = document.getElementById('playlists-select-list');
const addSongTitleLabel = document.getElementById('add-song-title-label');

// Helpers
function showToast(text, duration = 2800) {
    toastEl.innerText = text;
    toastEl.classList.remove('hidden');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.add('hidden'), duration);
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity || seconds == null) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(t) {
    if (!t) return '';
    return String(t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==================== VIEW ROUTER ====================
function showView(viewName, params = {}) {
    state.currentView = viewName;

    Object.keys(views).forEach(key => {
        if (views[key]) {
            if (key === viewName) {
                views[key].classList.add('active');
            } else {
                views[key].classList.remove('active');
            }
        }
    });

    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        if (item.getAttribute('data-page') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (dashboardScroll) {
        dashboardScroll.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (viewName === 'home') {
        renderHomeRecent();
        renderHomeTrending();
    } else if (viewName === 'search') {
        if (params.songs && params.query) {
            renderSearchView(params.songs, params.query, params.subtitle);
        }
    } else if (viewName === 'library') {
        renderLibraryView('lib-favs');
    } else if (viewName === 'favourites') {
        renderFavouritesView();
    } else if (viewName === 'playlists') {
        renderPlaylistsView();
    } else if (viewName === 'recent') {
        renderRecentView();
    } else if (viewName === 'trending') {
        renderTrendingView();
    } else if (viewName === 'artists') {
        renderArtistsView();
    } else if (viewName === 'albums') {
        renderAlbumsView();
    } else if (viewName === 'settings') {
        updateSettingsView();
    } else if (viewName === 'room') {
        renderRoomView();
    }
}

// Sidebar & Mobile Navigation Listeners
document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.getAttribute('data-page');
        if (page === 'search') {
            showView('search');
            globalSearch.focus();
            showToast('Search any song, artist, or album 🔍');
        } else {
            showView(page);
        }
    });
});

document.getElementById('brand-home-btn').addEventListener('click', () => {
    showView('home');
});

// Feature Badges at bottom
document.querySelectorAll('.feature-pill').forEach(pill => {
    pill.style.cursor = 'pointer';
    pill.addEventListener('click', () => {
        const action = pill.getAttribute('data-action');
        if (action === 'search') {
            showView('search');
            globalSearch.focus();
        } else if (action === 'favourites') {
            showView('favourites');
        } else if (action === 'playlists') {
            showView('playlists');
        } else if (action === 'recent') {
            showView('recent');
        } else if (action === 'trending') {
            showView('trending');
        } else if (action === 'theme') {
            themeToggleBtn.click();
        } else if (action === 'profile') {
            userProfileBtn.click();
        } else if (action === 'library') {
            showView('library');
        }
    });
});

// ==================== THEME MANAGEMENT ====================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
        themeIcon.className = 'fa-regular fa-moon';
    } else {
        themeIcon.className = 'fa-regular fa-sun';
    }
    localStorage.setItem('instasound_theme', theme);
}
applyTheme(state.theme);

themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    showToast(`Switched to ${state.theme.toUpperCase()} mode!`);
});

// ==================== NOTIFICATIONS & PROFILE ====================
notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel.classList.toggle('hidden');
    profileMenu.classList.add('hidden');
    songContextMenu.classList.add('hidden');
});

userProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('stat-favs').innerText = state.favorites.length;
    document.getElementById('stat-playlists').innerText = state.playlists.length;
    document.getElementById('stat-recent').innerText = state.recentSongs.length;
    profileMenu.classList.toggle('hidden');
    notifPanel.classList.add('hidden');
    songContextMenu.classList.add('hidden');
});

document.getElementById('menu-view-favs').addEventListener('click', (e) => {
    e.preventDefault();
    profileMenu.classList.add('hidden');
    showView('favourites');
});

document.getElementById('menu-view-playlists').addEventListener('click', (e) => {
    e.preventDefault();
    profileMenu.classList.add('hidden');
    showView('playlists');
});

document.getElementById('menu-settings-btn').addEventListener('click', (e) => {
    e.preventDefault();
    profileMenu.classList.add('hidden');
    showView('settings');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#notif-panel') && !e.target.closest('#notif-btn')) {
        notifPanel.classList.add('hidden');
    }
    if (!e.target.closest('#profile-menu') && !e.target.closest('#user-profile-btn')) {
        profileMenu.classList.add('hidden');
    }
    if (!e.target.closest('#song-context-menu')) {
        songContextMenu.classList.add('hidden');
    }
    if (!e.target.closest('.search-area')) {
        hideSuggestions();
    }
});

// ==================== SEARCH & AUTOCOMPLETE ====================
let searchDebounce = null;
let currentSuggestions = [];
let selectedSuggestIdx = -1;

globalSearch.addEventListener('input', () => {
    const query = globalSearch.value.trim();
    if (query.length > 0) {
        clearSearchBtn.classList.remove('hidden');
    } else {
        clearSearchBtn.classList.add('hidden');
        hideSuggestions();
        return;
    }

    if (query.includes('instagram.com') || query.length < 2) {
        hideSuggestions();
        return;
    }

    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        fetchSuggestions(query);
    }, 180);
});

async function fetchSuggestions(query) {
    try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.suggestions && data.suggestions.length > 0) {
            renderSuggestions(data.suggestions);
        } else {
            hideSuggestions();
        }
    } catch (e) {
        hideSuggestions();
    }
}

function renderSuggestions(list) {
    currentSuggestions = list;
    selectedSuggestIdx = -1;
    suggestionsDropdown.innerHTML = list.map((item, idx) => `
        <div class="suggestion-row" data-idx="${idx}">
            <i class="fa-solid fa-magnifying-glass"></i>
            <span class="s-text">${escapeHtml(item)}</span>
            <span class="s-tag">Song</span>
        </div>
    `).join('');

    suggestionsDropdown.querySelectorAll('.suggestion-row').forEach(row => {
        row.addEventListener('click', () => {
            const idx = parseInt(row.getAttribute('data-idx'));
            selectSuggestion(currentSuggestions[idx]);
        });
    });

    suggestionsDropdown.classList.remove('hidden');
}

function hideSuggestions() {
    suggestionsDropdown.classList.add('hidden');
    suggestionsDropdown.innerHTML = '';
}

function selectSuggestion(text) {
    globalSearch.value = text;
    clearSearchBtn.classList.remove('hidden');
    hideSuggestions();
    performSearch(text);
}

clearSearchBtn.addEventListener('click', () => {
    globalSearch.value = '';
    clearSearchBtn.classList.add('hidden');
    hideSuggestions();
    globalSearch.focus();
});

globalSearch.addEventListener('keydown', (e) => {
    const rows = suggestionsDropdown.querySelectorAll('.suggestion-row');
    if (!suggestionsDropdown.classList.contains('hidden') && rows.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedSuggestIdx = (selectedSuggestIdx + 1) % rows.length;
            highlightRow(rows);
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedSuggestIdx = (selectedSuggestIdx - 1 + rows.length) % rows.length;
            highlightRow(rows);
            return;
        } else if (e.key === 'Enter') {
            if (selectedSuggestIdx >= 0 && selectedSuggestIdx < currentSuggestions.length) {
                e.preventDefault();
                selectSuggestion(currentSuggestions[selectedSuggestIdx]);
                return;
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
            return;
        }
    }

    if (e.key === 'Enter') {
        hideSuggestions();
        performSearch(globalSearch.value.trim());
    }
});

function highlightRow(rows) {
    rows.forEach((r, i) => {
        if (i === selectedSuggestIdx) {
            r.classList.add('selected');
            globalSearch.value = currentSuggestions[i];
        } else {
            r.classList.remove('selected');
        }
    });
}

// Perform Search (30 songs, RENDER ONLY - NO AUTO-PLAY!)
async function performSearch(query) {
    if (!query) return;

    if (query.includes('instagram.com')) {
        showToast('Extracting Instagram Reel audio...');
        try {
            const res = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: query })
            });
            const data = await res.json();
            if (data.success) {
                const song = {
                    id: data.id,
                    title: data.title || 'Instagram Audio',
                    artist: data.uploader || 'Instagram Creator',
                    thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
                    audio_url: data.audio_url,
                    duration: data.duration || 30
                };
                registerSong(song);
                state.playlist = [song];
                showView('search', { songs: [song], query: 'Instagram Audio', subtitle: 'Extracted track' });
                showToast('Audio extracted! Click play to start listening.', 3500);
            } else {
                showToast('Failed to extract audio from link.');
            }
        } catch (err) {
            showToast('Error extracting Instagram audio.');
        }
        return;
    }

    showToast(`Searching for "${query}"...`, 2000);
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=30`);
        const data = await res.json();
        if (data.success && data.songs && data.songs.length > 0) {
            registerSongs(data.songs);
            state.playlist = data.songs;
            showView('search', {
                songs: data.songs,
                query: query,
                subtitle: `Found ${data.songs.length} full songs. Click any song to play!`
            });
            showToast(`Found ${data.songs.length} songs. Tap any track to play.`, 3000);
        } else {
            showToast(`No songs found for "${query}".`);
        }
    } catch (e) {
        showToast('Error searching songs.');
    }
}

function renderSearchView(songs, title, subtitle) {
    document.getElementById('search-view-title').innerText = title;
    document.getElementById('search-view-subtitle').innerText = subtitle || `${songs.length} songs available`;
    const playAllBtn = document.getElementById('search-play-all-btn');
    playAllBtn.classList.remove('hidden');
    playAllBtn.onclick = () => {
        if (songs.length > 0) playSong(songs[0], 0, songs);
    };

    const grid = document.getElementById('search-view-grid');
    grid.innerHTML = songs.map((s, idx) => createSongCardHtml(s, idx, 'search')).join('');
}

// ==================== CATEGORIES ====================
document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category');
        loadCategorySongs(cat);
    });
});

document.getElementById('see-all-categories').addEventListener('click', (e) => {
    e.preventDefault();
    loadCategorySongs('Trending');
});

document.getElementById('see-all-trending').addEventListener('click', (e) => {
    e.preventDefault();
    showView('trending');
});

document.getElementById('see-all-recent').addEventListener('click', (e) => {
    e.preventDefault();
    showView('recent');
});

async function loadCategorySongs(categoryName) {
    showToast(`Loading 30 ${categoryName} songs...`, 2000);
    globalSearch.value = `${categoryName} songs`;
    clearSearchBtn.classList.remove('hidden');

    try {
        const res = await fetch(`/api/category/${encodeURIComponent(categoryName.toLowerCase())}?limit=30`);
        const data = await res.json();
        if (data.success && data.songs && data.songs.length > 0) {
            registerSongs(data.songs);
            state.playlist = data.songs;
            showView('search', {
                songs: data.songs,
                query: `${categoryName} Hits (30 Songs)`,
                subtitle: `Curated ${categoryName} playlist. Tap any song to play!`
            });
            showToast(`Loaded 30 ${categoryName} songs. Tap any to play.`, 3000);
        } else {
            showToast(`Could not load ${categoryName} songs.`);
        }
    } catch (e) {
        showToast('Error loading category songs.');
    }
}

// Hero Play Button
heroPlayBtn.addEventListener('click', () => {
    if (state.currentSong) {
        togglePlayPause();
    } else if (state.trendingSongs.length > 0) {
        playSong(state.trendingSongs[0], 0, state.trendingSongs);
    }
});

// ==================== HTML GENERATORS & PLAY CLICK HANDLERS ====================
function createSongCardHtml(s, idx, context) {
    registerSong(s);
    const isLiked = isFav(s.id);
    const sid = escapeHtml(String(s.id));
    return `
        <div class="song-card-portrait" data-song-id="${sid}" onclick="playSongById('${sid}', '${context}')">
            <div class="card-img-wrap">
                <img src="${s.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}" alt="${escapeHtml(s.title)}" />
                <div class="card-play-overlay">
                    <button class="card-play-btn" onclick="event.stopPropagation(); playSongById('${sid}', '${context}')">
                        <i class="fa-solid fa-play"></i>
                    </button>
                </div>
            </div>
            <div class="card-info">
                <div class="card-text">
                    <div class="card-title">${escapeHtml(s.title)}</div>
                    <div class="card-artist">${escapeHtml(s.artist)}</div>
                </div>
                <button class="card-menu-btn" onclick="event.stopPropagation(); openContextMenuForId(event, '${sid}')">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
            </div>
        </div>
    `;
}

function createSongTableRowHtml(s, idx, context) {
    registerSong(s);
    const isLiked = isFav(s.id);
    const isCurrent = state.currentSong && state.currentSong.id === s.id;
    const sid = escapeHtml(String(s.id));
    return `
        <div class="table-row ${isCurrent ? 'active-row' : ''}" data-song-id="${sid}" onclick="playSongById('${sid}', '${context}')">
            <span class="row-rank">${idx + 1}</span>
            <img src="${s.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}" class="row-thumb" alt="${escapeHtml(s.title)}" />
            <div class="row-title-wrap">
                <div class="row-title">${escapeHtml(s.title)}</div>
                <div class="row-artist">${escapeHtml(s.artist)}</div>
            </div>
            <span class="row-duration">${s.duration_str || formatTime(s.duration)}</span>
            <button class="row-btn ${isLiked ? 'liked' : ''}" title="Toggle Favourite" onclick="event.stopPropagation(); toggleFav('${sid}')">
                <i class="${isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
            </button>
            <button class="row-btn" title="More Options" onclick="event.stopPropagation(); openContextMenuForId(event, '${sid}')">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
        </div>
    `;
}

// Master Play By ID - WORKS ON ANY SONG WORLDWIDE
window.playSongById = function(songId, context) {
    const song = songMap.get(String(songId));
    if (!song) {
        showToast('Song not found in library.');
        return;
    }

    let list = [song];
    if (context === 'home-recent' || context === 'recent') list = state.recentSongs;
    else if (context === 'trending' || context === 'home-trending') list = state.trendingSongs;
    else if (context === 'search') list = state.playlist;
    else if (context === 'detail') list = state.detailQueue;
    else if (context === 'favourites') list = state.favSongs;

    const idx = list.findIndex(s => String(s.id) === String(songId));
    playSong(song, idx >= 0 ? idx : 0, list);
};

// ==================== HOME VIEW ====================
function renderHomeRecent() {
    const grid = document.getElementById('home-recent-grid');
    const songsToRender = state.recentSongs.length > 0 ? state.recentSongs.slice(0, 6) : state.trendingSongs.slice(0, 6);
    grid.innerHTML = songsToRender.map((s, idx) => createSongCardHtml(s, idx, 'home-recent')).join('');
}

function renderHomeTrending() {
    const table = document.getElementById('home-trending-table');
    table.innerHTML = state.trendingSongs.slice(0, 8).map((s, idx) => createSongTableRowHtml(s, idx, 'home-trending')).join('');
}

// ==================== FAVOURITES VIEW ====================
function renderFavouritesView() {
    const table = document.getElementById('fav-table');
    const countSubtitle = document.getElementById('fav-count-subtitle');
    const playAllBtn = document.getElementById('fav-play-all-btn');

    const favList = state.favSongs.filter(s => state.favorites.includes(s.id));
    countSubtitle.innerText = `${favList.length} song${favList.length === 1 ? '' : 's'} saved in your collection`;

    if (favList.length === 0) {
        table.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-secondary);">
                <i class="fa-regular fa-heart" style="font-size:3rem;margin-bottom:14px;color:var(--accent-pink);"></i>
                <h3>No Liked Songs Yet</h3>
                <p style="margin-top:6px;">Click the heart icon ❤️ on any song to add it to your favourites.</p>
            </div>
        `;
        playAllBtn.classList.add('hidden');
        return;
    }

    playAllBtn.classList.remove('hidden');
    playAllBtn.onclick = () => {
        if (favList.length > 0) playSong(favList[0], 0, favList);
    };

    table.innerHTML = favList.map((s, idx) => createSongTableRowHtml(s, idx, 'favourites')).join('');
}

// ==================== PLAYLISTS VIEW ====================
function renderPlaylistsView() {
    const grid = document.getElementById('playlists-grid');
    grid.innerHTML = state.playlists.map(pl => {
        const coverImg = pl.songs.length > 0 && pl.songs[0].thumbnail 
            ? `<img src="${pl.songs[0].thumbnail}" alt="${escapeHtml(pl.name)}" />` 
            : `<i class="fa-solid fa-music"></i>`;

        return `
            <div class="playlist-card" onclick="openPlaylistDetail('${pl.id}')">
                <div class="playlist-art">
                    ${coverImg}
                    <button class="playlist-play-btn" title="Play Playlist" onclick="event.stopPropagation(); playPlaylist('${pl.id}')">
                        <i class="fa-solid fa-play"></i>
                    </button>
                </div>
                <button class="playlist-delete-btn" title="Delete Playlist" onclick="event.stopPropagation(); deletePlaylist('${pl.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <div class="playlist-title">${escapeHtml(pl.name)}</div>
                <div class="playlist-count">${pl.songs.length} Track${pl.songs.length === 1 ? '' : 's'}</div>
            </div>
        `;
    }).join('');
}

document.getElementById('open-create-playlist-btn').addEventListener('click', () => {
    playlistNameInput.value = '';
    createPlaylistModal.classList.remove('hidden');
    playlistNameInput.focus();
});

closeCreatePlaylistBtn.addEventListener('click', () => createPlaylistModal.classList.add('hidden'));
cancelPlaylistBtn.addEventListener('click', () => createPlaylistModal.classList.add('hidden'));

confirmCreatePlaylistBtn.addEventListener('click', () => {
    const name = playlistNameInput.value.trim();
    if (!name) {
        showToast('Please enter a playlist name.');
        return;
    }
    const newPl = {
        id: 'pl_' + Date.now(),
        name: name,
        songs: []
    };
    state.playlists.push(newPl);
    localStorage.setItem('instasound_playlists', JSON.stringify(state.playlists));
    createPlaylistModal.classList.add('hidden');
    renderPlaylistsView();
    showToast(`Playlist "${name}" created!`);
});

window.deletePlaylist = function(plId) {
    state.playlists = state.playlists.filter(p => p.id !== plId);
    localStorage.setItem('instasound_playlists', JSON.stringify(state.playlists));
    renderPlaylistsView();
    showToast('Playlist deleted.');
};

window.playPlaylist = function(plId) {
    const pl = state.playlists.find(p => p.id === plId);
    if (!pl || pl.songs.length === 0) {
        showToast('This playlist is empty. Add songs using ⋮ menu!');
        return;
    }
    registerSongs(pl.songs);
    playSong(pl.songs[0], 0, pl.songs);
};

window.openPlaylistDetail = function(plId) {
    const pl = state.playlists.find(p => p.id === plId);
    if (!pl) return;

    registerSongs(pl.songs);
    state.detailQueue = pl.songs;
    document.getElementById('detail-cover').src = pl.songs.length > 0 && pl.songs[0].thumbnail 
        ? pl.songs[0].thumbnail 
        : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500';
    document.getElementById('detail-type').innerText = 'PLAYLIST';
    document.getElementById('detail-title').innerText = pl.name;
    document.getElementById('detail-desc').innerText = `Custom Playlist • ${pl.songs.length} Tracks`;

    const playAllBtn = document.getElementById('detail-play-all-btn');
    playAllBtn.onclick = () => {
        if (pl.songs.length > 0) playSong(pl.songs[0], 0, pl.songs);
        else showToast('No songs in playlist to play.');
    };

    const songsTable = document.getElementById('detail-songs-table');
    if (pl.songs.length === 0) {
        songsTable.innerHTML = `<p style="text-align:center;padding:30px;color:var(--text-secondary);">No songs added yet. Use the ⋮ menu on any song to add it!</p>`;
    } else {
        songsTable.innerHTML = pl.songs.map((s, idx) => createSongTableRowHtml(s, idx, 'detail')).join('');
    }

    showView('detail');
};

// ==================== RECENTLY PLAYED VIEW ====================
function renderRecentView() {
    const grid = document.getElementById('recent-view-grid');
    const playAllBtn = document.getElementById('recent-play-all-btn');

    if (state.recentSongs.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1;text-align:center;padding:40px;color:var(--text-secondary);">No recently played songs yet. Start playing your favourite tracks!</p>`;
        playAllBtn.classList.add('hidden');
        return;
    }

    playAllBtn.classList.remove('hidden');
    playAllBtn.onclick = () => {
        if (state.recentSongs.length > 0) playSong(state.recentSongs[0], 0, state.recentSongs);
    };

    grid.innerHTML = state.recentSongs.map((s, idx) => createSongCardHtml(s, idx, 'recent')).join('');
}

// ==================== TRENDING VIEW ====================
function renderTrendingView() {
    const table = document.getElementById('trending-view-table');
    const playAllBtn = document.getElementById('trending-play-all-btn');

    playAllBtn.onclick = () => {
        if (state.trendingSongs.length > 0) playSong(state.trendingSongs[0], 0, state.trendingSongs);
    };

    table.innerHTML = state.trendingSongs.map((s, idx) => createSongTableRowHtml(s, idx, 'trending')).join('');
}

// ==================== ARTISTS VIEW ====================
async function renderArtistsView() {
    const grid = document.getElementById('artists-grid');
    if (state.artists.length === 0) {
        try {
            const res = await fetch('/api/artists');
            const data = await res.json();
            if (data.success && data.artists) {
                state.artists = data.artists;
            }
        } catch (e) {
            console.error('Failed to load artists:', e);
        }
    }

    grid.innerHTML = state.artists.map(art => `
        <div class="artist-card" onclick="openArtistDetail('${escapeHtml(art.name)}')">
            <div class="artist-avatar-wrap">
                <img src="${art.image}" class="artist-avatar" alt="${escapeHtml(art.name)}" />
                <button class="artist-play-btn" title="Play Top Songs" onclick="event.stopPropagation(); playArtist('${escapeHtml(art.name)}')">
                    <i class="fa-solid fa-play"></i>
                </button>
            </div>
            <div class="artist-name">${escapeHtml(art.name)}</div>
            <div class="artist-role">${escapeHtml(art.role || 'Artist')}</div>
            <div class="artist-listeners">${escapeHtml(art.monthly_listeners || 'Popular Artist')}</div>
        </div>
    `).join('');
}

window.openArtistDetail = async function(artistName) {
    showToast(`Loading songs for ${artistName}...`);
    try {
        const res = await fetch(`/api/artist/${encodeURIComponent(artistName)}`);
        const data = await res.json();
        if (data.success) {
            const art = data.artist;
            const songs = data.songs;
            registerSongs(songs);
            state.detailQueue = songs;

            document.getElementById('detail-cover').src = art.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';
            document.getElementById('detail-type').innerText = 'ARTIST';
            document.getElementById('detail-title').innerText = art.name;
            document.getElementById('detail-desc').innerText = `${art.role || 'Playback Singer'} • ${art.monthly_listeners || 'Top Chart Artist'} • ${songs.length} Songs`;

            const playAllBtn = document.getElementById('detail-play-all-btn');
            playAllBtn.onclick = () => {
                if (songs.length > 0) playSong(songs[0], 0, songs);
            };

            const songsTable = document.getElementById('detail-songs-table');
            songsTable.innerHTML = songs.map((s, idx) => createSongTableRowHtml(s, idx, 'detail')).join('');

            showView('detail');
        }
    } catch (e) {
        showToast('Failed to load artist songs.');
    }
};

window.playArtist = async function(artistName) {
    showToast(`Playing ${artistName}'s top hits...`);
    try {
        const res = await fetch(`/api/artist/${encodeURIComponent(artistName)}`);
        const data = await res.json();
        if (data.success && data.songs && data.songs.length > 0) {
            registerSongs(data.songs);
            playSong(data.songs[0], 0, data.songs);
        }
    } catch (e) {
        showToast('Error playing artist.');
    }
};

// ==================== ALBUMS VIEW ====================
async function renderAlbumsView() {
    const grid = document.getElementById('albums-grid');
    if (state.albums.length === 0) {
        try {
            const res = await fetch('/api/albums');
            const data = await res.json();
            if (data.success && data.albums) {
                state.albums = data.albums;
            }
        } catch (e) {
            console.error('Failed to load albums:', e);
        }
    }

    grid.innerHTML = state.albums.map(alb => `
        <div class="album-card" onclick="openAlbumDetail('${escapeHtml(alb.title)}')">
            <div class="album-cover-wrap">
                <img src="${alb.image}" class="album-cover" alt="${escapeHtml(alb.title)}" />
                <button class="album-play-btn" title="Play Album" onclick="event.stopPropagation(); playAlbum('${escapeHtml(alb.title)}')">
                    <i class="fa-solid fa-play"></i>
                </button>
            </div>
            <div class="album-title">${escapeHtml(alb.title)}</div>
            <div class="album-artist">${escapeHtml(alb.artist)}</div>
            <div class="album-sub">${escapeHtml(alb.year || '2026')} • ${escapeHtml(alb.songs_count || 'Album')}</div>
        </div>
    `).join('');
}

window.openAlbumDetail = async function(albumTitle) {
    showToast(`Loading album "${albumTitle}"...`);
    try {
        const res = await fetch(`/api/album/${encodeURIComponent(albumTitle)}`);
        const data = await res.json();
        if (data.success) {
            const alb = data.album;
            const songs = data.songs;
            registerSongs(songs);
            state.detailQueue = songs;

            document.getElementById('detail-cover').src = alb.image || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400';
            document.getElementById('detail-type').innerText = 'ALBUM';
            document.getElementById('detail-title').innerText = alb.title;
            document.getElementById('detail-desc').innerText = `${alb.artist} • ${alb.year || '2026'} • ${songs.length} Tracks`;

            const playAllBtn = document.getElementById('detail-play-all-btn');
            playAllBtn.onclick = () => {
                if (songs.length > 0) playSong(songs[0], 0, songs);
            };

            const songsTable = document.getElementById('detail-songs-table');
            songsTable.innerHTML = songs.map((s, idx) => createSongTableRowHtml(s, idx, 'detail')).join('');

            showView('detail');
        }
    } catch (e) {
        showToast('Failed to load album tracks.');
    }
};

window.playAlbum = async function(albumTitle) {
    showToast(`Starting album "${albumTitle}"...`);
    try {
        const res = await fetch(`/api/album/${encodeURIComponent(albumTitle)}`);
        const data = await res.json();
        if (data.success && data.songs && data.songs.length > 0) {
            registerSongs(data.songs);
            playSong(data.songs[0], 0, data.songs);
        }
    } catch (e) {
        showToast('Error playing album.');
    }
};

// ==================== LIBRARY VIEW ====================
function renderLibraryView(subTab = 'lib-favs') {
    document.querySelectorAll('.sub-tab').forEach(t => {
        if (t.getAttribute('data-sub') === subTab) t.classList.add('active');
        else t.classList.remove('active');
    });

    const container = document.getElementById('library-content');
    if (subTab === 'lib-favs') {
        const favList = state.favSongs.filter(s => state.favorites.includes(s.id));
        if (favList.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1;text-align:center;padding:30px;color:var(--text-secondary);">No liked songs yet. Tap the heart icon ❤️ on any song!</p>`;
        } else {
            container.innerHTML = favList.map((s, idx) => createSongCardHtml(s, idx, 'favourites')).join('');
        }
    } else if (subTab === 'lib-playlists') {
        container.innerHTML = state.playlists.map(pl => `
            <div class="playlist-card" onclick="openPlaylistDetail('${pl.id}')">
                <div class="playlist-art">
                    ${pl.songs.length > 0 && pl.songs[0].thumbnail ? `<img src="${pl.songs[0].thumbnail}" />` : `<i class="fa-solid fa-music"></i>`}
                    <button class="playlist-play-btn" onclick="event.stopPropagation(); playPlaylist('${pl.id}')">
                        <i class="fa-solid fa-play"></i>
                    </button>
                </div>
                <div class="playlist-title">${escapeHtml(pl.name)}</div>
                <div class="playlist-count">${pl.songs.length} Tracks</div>
            </div>
        `).join('');
    } else if (subTab === 'lib-recent') {
        if (state.recentSongs.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1;text-align:center;padding:30px;color:var(--text-secondary);">No recently played tracks yet.</p>`;
        } else {
            container.innerHTML = state.recentSongs.map((s, idx) => createSongCardHtml(s, idx, 'recent')).join('');
        }
    }
}

document.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const sub = tab.getAttribute('data-sub');
        renderLibraryView(sub);
    });
});

// ==================== SETTINGS VIEW ====================
function updateSettingsView() {
    const qualitySelect = document.getElementById('setting-quality-select');
    const autoPlayToggle = document.getElementById('setting-autoplay-toggle');
    const savedQuality = localStorage.getItem('instasound_quality') || '192';

    if (qualitySelect) qualitySelect.value = savedQuality;
    if (autoPlayToggle) autoPlayToggle.checked = state.autoPlayNext;
}

const settingQualitySelect = document.getElementById('setting-quality-select');
if (settingQualitySelect) {
    settingQualitySelect.addEventListener('change', (e) => {
        localStorage.setItem('instasound_quality', e.target.value);
        showToast(`Audio quality set to ${e.target.value} kbps`);
    });
}

const settingThemeBtn = document.getElementById('setting-theme-btn');
if (settingThemeBtn) {
    settingThemeBtn.addEventListener('click', () => {
        themeToggleBtn.click();
    });
}

const settingAutoplayToggle = document.getElementById('setting-autoplay-toggle');
if (settingAutoplayToggle) {
    settingAutoplayToggle.addEventListener('change', (e) => {
        state.autoPlayNext = e.target.checked;
        localStorage.setItem('instasound_autoplay', JSON.stringify(state.autoPlayNext));
        showToast(`Auto-play next track: ${state.autoPlayNext ? 'ON' : 'OFF'}`);
    });
}

const settingClearDataBtn = document.getElementById('setting-clear-data-btn');
if (settingClearDataBtn) {
    settingClearDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your local listening history and cached data?')) {
            localStorage.removeItem('instasound_favs');
            localStorage.removeItem('instasound_fav_songs');
            localStorage.removeItem('instasound_recent');
            state.favorites = [];
            state.favSongs = [];
            state.recentSongs = [];
            showToast('All local listening data reset successfully!');
            showView('home');
        }
    });
}

// ==================== 3-DOTS CONTEXT MENU ====================
function openContextMenuForId(event, songId) {
    state.contextSong = songMap.get(String(songId));
    if (!state.contextSong) return;
    songContextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 260)}px`;
    songContextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 220)}px`;
    songContextMenu.classList.remove('hidden');
}

document.getElementById('ctx-play').addEventListener('click', () => {
    if (state.contextSong) {
        playSong(state.contextSong, 0, [state.contextSong]);
    }
    songContextMenu.classList.add('hidden');
});

document.getElementById('ctx-queue').addEventListener('click', () => {
    if (state.contextSong) {
        state.playlist.push(state.contextSong);
        renderQueue();
        showToast(`Added "${state.contextSong.title}" to Queue!`);
    }
    songContextMenu.classList.add('hidden');
});

document.getElementById('ctx-fav').addEventListener('click', () => {
    if (state.contextSong) {
        toggleFav(state.contextSong.id);
    }
    songContextMenu.classList.add('hidden');
});

document.getElementById('ctx-add-playlist').addEventListener('click', () => {
    songContextMenu.classList.add('hidden');
    if (!state.contextSong) return;
    openAddToPlaylistModal(state.contextSong);
});

document.getElementById('ctx-view-artist').addEventListener('click', () => {
    songContextMenu.classList.add('hidden');
    if (state.contextSong && state.contextSong.artist) {
        openArtistDetail(state.contextSong.artist);
    }
});

document.getElementById('ctx-view-album').addEventListener('click', () => {
    songContextMenu.classList.add('hidden');
    if (state.contextSong && state.contextSong.album) {
        openAlbumDetail(state.contextSong.album);
    } else {
        showToast('No specific album found for this track.');
    }
});

document.getElementById('ctx-download').addEventListener('click', () => {
    songContextMenu.classList.add('hidden');
    if (state.contextSong) {
        const downloadUrl = state.contextSong.audio_url || `/api/stream-audio/${state.contextSong.id}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${state.contextSong.title} - ${state.contextSong.artist}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloading "${state.contextSong.title}"...`);
    }
});

// Add to Playlist Modal
function openAddToPlaylistModal(song) {
    addSongTitleLabel.innerText = `Adding "${song.title}" to:`;
    playlistsSelectList.innerHTML = state.playlists.map(pl => `
        <div class="pl-select-item" onclick="confirmAddSongToPlaylist('${pl.id}')">
            <i class="fa-solid fa-list-check"></i>
            <div class="pl-select-name">${escapeHtml(pl.name)}</div>
            <div class="pl-select-count">${pl.songs.length} Tracks</div>
        </div>
    `).join('');
    addToPlaylistModal.classList.remove('hidden');
}

closeAddPlaylistBtn.addEventListener('click', () => addToPlaylistModal.classList.add('hidden'));

window.confirmAddSongToPlaylist = function(plId) {
    const pl = state.playlists.find(p => p.id === plId);
    if (pl && state.contextSong) {
        if (!pl.songs.some(s => s.id === state.contextSong.id)) {
            pl.songs.push(state.contextSong);
            localStorage.setItem('instasound_playlists', JSON.stringify(state.playlists));
            showToast(`Added to "${pl.name}"!`);
        } else {
            showToast(`Song already in "${pl.name}".`);
        }
    }
    addToPlaylistModal.classList.add('hidden');
};

// ==================== QUEUE DRAWER ====================
queueBtn.addEventListener('click', () => {
    renderQueue();
    queueDrawer.classList.toggle('hidden');
});

closeQueueBtn.addEventListener('click', () => {
    queueDrawer.classList.add('hidden');
});

clearQueueBtn.addEventListener('click', () => {
    if (state.currentSong) {
        state.playlist = [state.currentSong];
        state.currentIndex = 0;
    } else {
        state.playlist = [];
        state.currentIndex = -1;
    }
    renderQueue();
    showToast('Queue cleared.');
});

function renderQueue() {
    queueCount.innerText = state.playlist.length;
    if (!state.playlist.length) {
        queueList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px 10px;">Queue is empty.</p>';
        return;
    }
    queueList.innerHTML = state.playlist.map((s, idx) => {
        registerSong(s);
        return `
            <div class="queue-item ${state.currentIndex === idx ? 'active' : ''}" onclick="playSongAtIndex(${idx}, 'queue')">
                <img src="${s.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}" alt="${escapeHtml(s.title)}" />
                <div class="queue-info">
                    <h6>${escapeHtml(s.title)}</h6>
                    <p>${escapeHtml(s.artist)}</p>
                </div>
            </div>
        `;
    }).join('');
}

window.playSongAtIndex = function(idx, context) {
    if (context === 'queue') {
        playSong(state.playlist[idx], idx, state.playlist);
    }
};

// ==================== AUDIO PLAY ENGINE (PLAYS ANY SONG) ====================
async function playSong(song, index, playlist) {
    if (!song) return;

    registerSong(song);

    state.currentSong = song;
    state.currentIndex = index >= 0 ? index : 0;
    state.playlist = playlist && playlist.length > 0 ? playlist : [song];

    // Prepend to Recently Played
    addToRecent(song);

    // Update Bottom Player Bar UI
    setPlayerMetadata(song);

    // Primary audio stream URL via backend proxy (same origin, Range seek support, no CORS)
    let audioSrc = (!song.audio_url || song.audio_url.includes('soundhelix') || !song.audio_url.startsWith('http')) 
        ? (`/api/stream-audio/${song.id}`) 
        : song.audio_url;
    song.audio_url = audioSrc;

    // Broadcast to room members so everyone switches songs synchronously!
    if (state.room && state.room.code && !state.room.isSyncing) {
        state.room.currentSong = song;
        broadcastRoomEvent({
            action: 'CHANGE_SONG',
            event: 'CHANGE_SONG',
            song: song,
            position: 0,
            is_playing: true
        });
        updateRoomNowPlayingUI();
    }

    showToast(`Loading: ${song.title}...`, 2000);
    if (!audio.src || !audio.src.includes(song.id)) {
        audio.src = audioSrc;
    }

    audio.play().then(() => {
        state.isPlaying = true;
        updatePlayIcons();
        showToast(`▶ Now Playing: ${song.title}`);
        updateRoomNowPlayingUI();
        hideAudioUnlockOverlay();
    }).catch(err => {
        console.warn('Playback caught (gesture required):', err);
        updateRoomNowPlayingUI();
        showAudioUnlockOverlay();
        // Fallback: If proxy stream took time, attempt direct song-stream
        if (song.id && !song._retriedDirect) {
            song._retriedDirect = true;
            fetch(`/api/song-stream/${song.id}`)
                .then(r => r.json())
                .then(d => {
                    if (d.success && d.audio_url) {
                        audio.src = d.audio_url;
                        audio.play().then(() => {
                            state.isPlaying = true;
                            updatePlayIcons();
                            showToast(`▶ Now Playing: ${song.title}`);
                            hideAudioUnlockOverlay();
                            if (state.room && state.room.code && !state.room.isSyncing) {
                                broadcastRoomEvent({
                                    action: 'CHANGE_SONG',
                                    event: 'CHANGE_SONG',
                                    song: song,
                                    position: 0,
                                    is_playing: true
                                });
                            }
                            updateRoomNowPlayingUI();
                        }).catch(() => showAudioUnlockOverlay());
                    }
                })
                .catch(() => {});
        }
    });

    // Update active row highlight across visible tables
    document.querySelectorAll('.table-row').forEach(row => {
        if (row.getAttribute('data-song-id') === String(song.id)) {
            row.classList.add('active-row');
        } else {
            row.classList.remove('active-row');
        }
    });

    if (!queueDrawer.classList.contains('hidden')) renderQueue();
    updateMediaSession(song);
}

function setPlayerMetadata(song) {
    playerTitle.innerText = song.title;
    playerArtist.innerText = song.artist;
    playerThumb.src = song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200';
    totalDurationEl.innerText = song.duration_str || formatTime(song.duration);

    if (isFav(song.id)) {
        playerFavBtn.classList.add('liked');
        playerFavBtn.querySelector('i').className = 'fa-solid fa-heart';
    } else {
        playerFavBtn.classList.remove('liked');
        playerFavBtn.querySelector('i').className = 'fa-regular fa-heart';
    }
}

function togglePlayPause() {
    if (!state.currentSong && state.trendingSongs && state.trendingSongs.length > 0) {
        playSong(state.trendingSongs[0], 0, state.trendingSongs);
        return;
    }

    if (audio.paused) {
        audio.play().then(() => {
            state.isPlaying = true;
            updatePlayIcons();
            if (state.room && state.room.code && !state.room.isSyncing) {
                broadcastRoomEvent({
                    action: 'PLAY',
                    event: 'PLAY',
                    position: audio.currentTime || 0,
                    song: state.currentSong
                });
            }
            updateRoomVisualizer();
            updateRoomStageActionBtn();
            hideAudioUnlockOverlay();
        }).catch(e => {
            console.warn('Play error:', e);
            showAudioUnlockOverlay();
        });
    } else {
        audio.pause();
        state.isPlaying = false;
        updatePlayIcons();
        if (state.room && state.room.code && !state.room.isSyncing) {
            broadcastRoomEvent({
                action: 'PAUSE',
                event: 'PAUSE',
                position: audio.currentTime || 0,
                song: state.currentSong
            });
        }
        updateRoomVisualizer();
        updateRoomStageActionBtn();
    }
}

function updatePlayIcons() {
    if (state.isPlaying) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
}

playPauseBtn.addEventListener('click', togglePlayPause);

// Audio Engine Error Handler
audio.addEventListener('error', () => {
    console.error('Audio engine error:', audio.error);
    if (state.currentSong && !state.currentSong._retriedDirect) {
        state.currentSong._retriedDirect = true;
        fetch(`/api/song-stream/${state.currentSong.id}`)
            .then(r => r.json())
            .then(d => {
                if (d.success && d.audio_url) {
                    audio.src = d.audio_url;
                    audio.play().catch(() => {});
                }
            })
            .catch(() => {});
    }
});

// Seekbar Timeline Dragging & Scrubbing
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    seekbarFill.style.width = `${pct}%`;
    seekbarThumb.style.left = `${pct}%`;
    currentTimeEl.innerText = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    totalDurationEl.innerText = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
    if (state.isLooping) {
        audio.currentTime = 0;
        audio.play();
    } else if (state.autoPlayNext) {
        playNext();
    } else {
        state.isPlaying = false;
        updatePlayIcons();
    }
});

seekbarTrack.addEventListener('click', (e) => {
    const rect = seekbarTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (audio.duration) {
        const newTime = (clickX / width) * audio.duration;
        audio.currentTime = newTime;
        if (state.room && state.room.code && !state.room.isSyncing) {
            broadcastRoomEvent({ action: 'SEEK', event: 'SEEK', position: newTime });
        }
    }
});

// Next & Prev Controls
function playNext() {
    if (!state.playlist.length) return;
    if (state.isShuffled) {
        state.currentIndex = Math.floor(Math.random() * state.playlist.length);
    } else {
        state.currentIndex = (state.currentIndex + 1) % state.playlist.length;
    }
    playSong(state.playlist[state.currentIndex], state.currentIndex, state.playlist);
}

function playPrev() {
    if (!state.playlist.length) return;
    state.currentIndex = (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
    playSong(state.playlist[state.currentIndex], state.currentIndex, state.playlist);
}

nextBtn.addEventListener('click', playNext);
prevBtn.addEventListener('click', playPrev);

// Loop & Shuffle Controls
loopBtn.addEventListener('click', () => {
    state.isLooping = !state.isLooping;
    loopBtn.classList.toggle('active', state.isLooping);
    showToast(state.isLooping ? 'Repeat Mode On 🔁' : 'Repeat Mode Off');
});

shuffleBtn.addEventListener('click', () => {
    state.isShuffled = !state.isShuffled;
    shuffleBtn.classList.toggle('active', state.isShuffled);
    showToast(state.isShuffled ? 'Shuffle Mode On 🔀' : 'Shuffle Mode Off');
});

// Volume Controls
volumeSlider.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
    if (audio.volume === 0) {
        volumeIconBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else if (audio.volume < 0.5) {
        volumeIconBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
        volumeIconBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
});

volumeIconBtn.addEventListener('click', () => {
    if (audio.volume > 0) {
        audio.volume = 0;
        volumeSlider.value = 0;
        volumeIconBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else {
        audio.volume = 1;
        volumeSlider.value = 1;
        volumeIconBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
});

// MediaSession Helper
function updateMediaSession(song) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: song.album || 'My Music',
            artwork: [{ src: song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500', sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('play', togglePlayPause);
        navigator.mediaSession.setActionHandler('pause', togglePlayPause);
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
}

// ==================== FAVOURITES LOGIC ====================
function isFav(id) {
    return state.favorites.includes(String(id));
}

window.toggleFav = function(songId) {
    const sid = String(songId);
    if (isFav(sid)) {
        state.favorites = state.favorites.filter(x => x !== sid);
        state.favSongs = state.favSongs.filter(x => String(x.id) !== sid);
        showToast('Removed from Favourites');
    } else {
        state.favorites.push(sid);
        const song = songMap.get(sid);
        if (song && !state.favSongs.some(s => String(s.id) === sid)) {
            state.favSongs.push(song);
        }
        showToast('Added to Favourites! ❤️');
    }

    localStorage.setItem('instasound_favs', JSON.stringify(state.favorites));
    localStorage.setItem('instasound_fav_songs', JSON.stringify(state.favSongs));

    if (state.currentSong && String(state.currentSong.id) === sid) {
        setPlayerMetadata(state.currentSong);
    }

    if (state.currentView === 'favourites') {
        renderFavouritesView();
    } else {
        document.querySelectorAll(`.table-row[data-song-id="${sid}"]`).forEach(row => {
            const btn = row.querySelector('.row-btn[title="Toggle Favourite"]');
            if (btn) {
                const liked = isFav(sid);
                btn.className = `row-btn ${liked ? 'liked' : ''}`;
                btn.innerHTML = `<i class="${liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>`;
            }
        });
    }
};

playerFavBtn.addEventListener('click', () => {
    if (state.currentSong) toggleFav(state.currentSong.id);
});

// Recently Played Logger
function addToRecent(song) {
    state.recentSongs = state.recentSongs.filter(s => String(s.id) !== String(song.id));
    state.recentSongs.unshift(song);
    if (state.recentSongs.length > 30) state.recentSongs.pop();
    localStorage.setItem('instasound_recent', JSON.stringify(state.recentSongs));
}

// ==================== INITIAL BOOTSTRAP ====================
async function bootstrapApp() {
    try {
        const res = await fetch('/api/trending');
        const data = await res.json();
        if (data.success && data.songs) {
            registerSongs(data.songs);
            state.trendingSongs = data.songs;
            state.playlist = data.songs;

            data.songs.forEach(s => {
                if (state.favorites.includes(String(s.id)) && !state.favSongs.some(f => String(f.id) === String(s.id))) {
                    state.favSongs.push(s);
                }
            });
            localStorage.setItem('instasound_fav_songs', JSON.stringify(state.favSongs));

            // Set metadata on persistent player BUT DO NOT PLAY!
            if (data.songs.length > 0) {
                setPlayerMetadata(data.songs[0]);
            }

            // Initial view (keep room view if joining via invite or already connected)
            if (!state.room.code && !window.location.search.includes('room=')) {
                showView('home');
            }
        }
    } catch (e) {
        console.error('Failed to bootstrap app data:', e);
    }
}

// ==================== MUSIC ROOM (LISTEN TOGETHER) CONTROLLER ====================

// Room DOM Elements
const createRoomBtn = document.getElementById('create-room-btn');
const createRoomNameInput = document.getElementById('create-room-name');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinRoomNameInput = document.getElementById('join-room-name');
const joinRoomCodeInput = document.getElementById('join-room-code');

const roomLobby = document.getElementById('room-lobby');
const roomActive = document.getElementById('room-active');
const activeRoomCodeDisplay = document.getElementById('active-room-code-display');
const activeRoomRoleBadge = document.getElementById('active-room-role-badge');
const activeRoomListenersCount = document.getElementById('active-room-listeners-count');

const roomCopyCodeBtn = document.getElementById('room-copy-code-btn');
const roomShareLinkBtn = document.getElementById('room-share-link-btn');
const roomLeaveBtn = document.getElementById('room-leave-btn');

const roomTrackCover = document.getElementById('room-track-cover');
const roomTrackTitle = document.getElementById('room-track-title');
const roomTrackArtist = document.getElementById('room-track-artist');
const roomControlNoticeText = document.getElementById('room-control-notice-text');
const roomVisualizer = document.querySelector('.room-visualizer-bars');

const roomMembersList = document.getElementById('room-members-list');
const roomMemberCountBadge = document.getElementById('room-member-count-badge');
const roomQueueList = document.getElementById('room-queue-list');
const roomQueueCount = document.getElementById('room-queue-count');

const roomChatMessages = document.getElementById('room-chat-messages');
const roomChatForm = document.getElementById('room-chat-form');
const roomChatInput = document.getElementById('room-chat-input');

const bottomRoomIndicator = document.getElementById('bottom-room-indicator');
const bottomRoomStatus = document.getElementById('bottom-room-status');

// Helper: Broadcast event over Room WebSocket
function broadcastRoomEvent(eventOrObj, payload = {}) {
    if (!state.room || !state.room.code) return;

    let eventName = '';
    let dataObj = {};
    if (typeof eventOrObj === 'object') {
        eventName = eventOrObj.event || eventOrObj.action;
        dataObj = { ...eventOrObj };
        delete dataObj.event;
        delete dataObj.action;
    } else {
        eventName = eventOrObj;
        dataObj = { ...payload };
    }

    const jsonMsg = JSON.stringify({ event: eventName, data: dataObj });

    if (state.room.ws && state.room.ws.readyState === WebSocket.OPEN) {
        state.room.ws.send(jsonMsg);
    } else {
        console.warn('[Music Room] WebSocket not connected (state: ' + (state.room.ws ? state.room.ws.readyState : 'none') + '). Reconnecting...');
        connectRoomWebSocket(state.room.code, state.room.clientId, state.room.name);
        setTimeout(() => {
            if (state.room.ws && state.room.ws.readyState === WebSocket.OPEN) {
                state.room.ws.send(jsonMsg);
            }
        }, 1200);
    }
}

// 1. Create Room Action
if (createRoomBtn) {
    createRoomBtn.addEventListener('click', async () => {
        const name = (createRoomNameInput.value || 'Host').trim();
        state.room.name = name;
        localStorage.setItem('instasound_user_name', name);

        const currentOrTrending = state.currentSong || (state.trendingSongs.length > 0 ? state.trendingSongs[0] : null);

        createRoomBtn.disabled = true;
        createRoomBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

        try {
            const res = await fetch('/api/room/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host_name: name,
                    client_id: state.room.clientId,
                    initial_song: currentOrTrending
                })
            });
            const data = await res.json();

            if (data.success && data.room_code) {
                state.room.code = data.room_code;
                state.room.isHost = true;
                state.room.hostId = state.room.clientId;
                state.room.hostName = name;
                if (currentOrTrending) {
                    state.room.currentSong = currentOrTrending;
                }

                connectRoomWebSocket(data.room_code, state.room.clientId, name);
                updateRoomUrl(data.room_code);
                renderRoomView();
                showToast(`🎉 Room ${data.room_code} created! You are the Host.`);
            } else {
                showToast('Failed to create room.');
            }
        } catch (err) {
            console.error('Create room error:', err);
            showToast('Error connecting to server.');
        } finally {
            createRoomBtn.disabled = false;
            createRoomBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Create New Room';
        }
    });
}

// Room Code Sanitizer & Parser
function parseRoomCode(raw) {
    if (!raw) return '';
    let c = String(raw).trim();
    if (c.includes('room=')) {
        c = c.split('room=')[1].split('&')[0];
    }
    return c.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
}

// Global Join Function (Used by button, URL invite, and Active Rooms list)
window.joinRoomByCode = async function(rawCode, customName, isAuto = false) {
    const code = parseRoomCode(rawCode || (joinRoomCodeInput ? joinRoomCodeInput.value : ''));
    if (!code || code.length < 4) {
        showToast('Please enter a valid 6-letter Room Code (e.g. M7K9X2).');
        return false;
    }

    const name = (customName || (joinRoomNameInput ? joinRoomNameInput.value : '') || state.room.name || 'Guest').trim();
    state.room.name = name;
    localStorage.setItem('instasound_user_name', name);

    if (joinRoomBtn) {
        joinRoomBtn.disabled = true;
        joinRoomBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Joining...';
    }

    showToast(`Connecting to Room ${code}...`, 2000);

    try {
        const res = await fetch(`/api/room/${code}`);
        const data = await res.json();

        if (data.success && data.room) {
            state.room.code = code;
            state.room.isHost = (data.room.host_id === state.room.clientId);
            state.room.hostId = data.room.host_id;

            connectRoomWebSocket(code, state.room.clientId, name);
            updateRoomUrl(code);
            showView('room');
            renderRoomView();
            showToast(`🎧 Connected to Room ${code}!`);
            return true;
        } else {
            showToast(data.detail || 'Room not found or has expired. Please check code or ask Host.');
            fetchActiveRooms();
            return false;
        }
    } catch (err) {
        console.error('Join room error:', err);
        showToast('Server connection error. Please try again.');
        return false;
    } finally {
        if (joinRoomBtn) {
            joinRoomBtn.disabled = false;
            joinRoomBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Join Room';
        }
    }
};

// 2. Join Room Action
if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
        window.joinRoomByCode();
    });
}

// NTP Clock Offset & Latency Synchronization for Music Room
let roomClockOffset = 0; // ms difference: serverTime - clientLocalTime
let roomRtt = 40; // ms round-trip time
let roomPingTimer = null;

function sendRoomPing() {
    if (state.room.ws && state.room.ws.readyState === WebSocket.OPEN) {
        state.room.ws.send(JSON.stringify({
            event: 'PING',
            data: { client_t: performance.now() }
        }));
    }
}

function startRoomPingHeartbeat() {
    if (roomPingTimer) clearInterval(roomPingTimer);
    sendRoomPing();
    roomPingTimer = setInterval(sendRoomPing, 8000);
}

function stopRoomPingHeartbeat() {
    if (roomPingTimer) {
        clearInterval(roomPingTimer);
        roomPingTimer = null;
    }
}

function getAccuratePlaybackPosition(reportedPos, isPlaying, serverTime) {
    if (!isPlaying) return reportedPos || 0;
    const nowServerTime = Date.now() + roomClockOffset;
    let elapsedSec = (nowServerTime - (serverTime || nowServerTime)) / 1000;
    // Bound elapsed time to sane limits (0 to 2 seconds max)
    if (elapsedSec < 0 || elapsedSec > 2.5) {
        elapsedSec = (roomRtt / 2000);
    }
    return Math.max(0, (reportedPos || 0) + elapsedSec);
}

function alignPlaybackDrift(targetPos, isPlaying) {
    if (state.room.isHost) return; // Host is master clock
    if (!audio.src) return;

    if (isPlaying && audio.paused) {
        audio.currentTime = targetPos;
        state.room.isSyncing = true;
        audio.play().then(() => {
            hideAudioUnlockOverlay();
            updateRoomStageActionBtn();
        }).catch(() => {
            showAudioUnlockOverlay();
        }).finally(() => {
            state.room.isSyncing = false;
        });
        return;
    }

    if (!isPlaying && !audio.paused) {
        audio.currentTime = targetPos;
        audio.pause();
        state.isPlaying = false;
        updatePlayIcons();
        updateRoomVisualizer();
        updateRoomStageActionBtn();
        return;
    }

    if (isPlaying && !audio.paused) {
        const drift = audio.currentTime - targetPos;
        const absDrift = Math.abs(drift);

        if (absDrift > 1.2) {
            // Hard jump for large drift
            audio.currentTime = targetPos;
            audio.playbackRate = 1.0;
        } else if (absDrift > 0.25) {
            // Smooth rate adjustment (no audio cutting/stuttering)
            if (drift < 0) {
                // Behind host -> speed up slightly
                audio.playbackRate = 1.05;
            } else {
                // Ahead of host -> slow down slightly
                audio.playbackRate = 0.95;
            }
        } else {
            // In perfect sync (within 250ms)
            if (audio.playbackRate !== 1.0) {
                audio.playbackRate = 1.0;
            }
        }
    }
}

// 3. WebSocket Connection Management
function connectRoomWebSocket(roomCode, clientId, name) {
    if (state.room.ws) {
        state.room.ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/room/${roomCode}?client_id=${clientId}&name=${encodeURIComponent(name)}`;

    const ws = new WebSocket(wsUrl);
    state.room.ws = ws;

    ws.onopen = () => {
        console.log(`[Music Room] WebSocket connected to ${roomCode}`);
        ws.send(JSON.stringify({
            event: 'JOIN',
            client_id: clientId,
            name: name
        }));
        startRoomPingHeartbeat();
        updateBottomRoomIndicator();
    };

    ws.onmessage = (evt) => {
        try {
            const msg = JSON.parse(evt.data);
            handleRoomWsMessage(msg);
        } catch (err) {
            console.error('[Music Room] Failed to parse message:', err);
        }
    };

    ws.onclose = () => {
        console.log('[Music Room] WebSocket disconnected.');
        stopRoomPingHeartbeat();
        updateBottomRoomIndicator();
    };

    ws.onerror = (err) => {
        console.warn('[Music Room] WebSocket error:', err);
    };
}

// 4. Handle Incoming Synchronized Events
function handleRoomWsMessage(msg) {
    const event = msg.event || msg.type;
    const payload = msg.data || msg;
    const serverTime = msg.server_time || Date.now();

    if (event === 'PONG') {
        const t0 = payload.client_t || 0;
        const t1 = performance.now();
        const rtt = Math.max(5, t1 - t0);
        roomRtt = rtt;
        const serverAtArrival = payload.server_time + (rtt / 2);
        roomClockOffset = serverAtArrival - Date.now();
        return;
    }

    if (event === 'ROOM_STATE') {
        state.room.hostId = payload.host_id;
        state.room.isHost = (state.room.clientId === payload.host_id);
        state.room.members = payload.members || [];
        state.room.queue = payload.queue || [];
        state.room.isPlaying = payload.is_playing;

        renderRoomHeader();
        renderRoomMembers();
        renderRoomQueue();

        if (payload.chat_messages && payload.chat_messages.length > 0) {
            roomChatMessages.innerHTML = '';
            payload.chat_messages.forEach(c => appendChatMessage(c.sender, c.text, c.sender === state.room.name, false));
        }

        if (payload.current_song) {
            syncSongPlayback(payload.current_song, payload.position, payload.is_playing, serverTime);
        } else {
            updateRoomNowPlayingUI();
        }
    } else if (event === 'SONG_CHANGED') {
        if (!state.room.isHost) {
            syncSongPlayback(payload.song, payload.position, payload.is_playing, serverTime);
        }
    } else if (event === 'PLAY_SYNC') {
        state.room.isPlaying = true;
        if (!state.room.isHost) {
            const songToPlay = payload.song || state.room.currentSong || state.currentSong;
            if (songToPlay && (!state.currentSong || String(state.currentSong.id) !== String(songToPlay.id) || !audio.src)) {
                syncSongPlayback(songToPlay, payload.position, true, serverTime);
            } else {
                const targetPos = getAccuratePlaybackPosition(payload.position, true, serverTime);
                alignPlaybackDrift(targetPos, true);
                state.isPlaying = true;
                updatePlayIcons();
                updateRoomVisualizer();
                updateRoomStageActionBtn();
            }
        }
    } else if (event === 'PAUSE_SYNC') {
        state.room.isPlaying = false;
        if (!state.room.isHost) {
            const targetPos = payload.position != null ? payload.position : audio.currentTime;
            alignPlaybackDrift(targetPos, false);
        }
    } else if (event === 'SEEK_SYNC') {
        if (!state.room.isHost) {
            const isPlaying = payload.is_playing !== undefined ? payload.is_playing : !audio.paused;
            const targetPos = getAccuratePlaybackPosition(payload.position, isPlaying, serverTime);
            audio.currentTime = targetPos;
            audio.playbackRate = 1.0;
        }
    } else if (event === 'PERIODIC_SYNC') {
        // High-precision clock drift correction for room members
        if (!state.room.isHost && audio.src) {
            const isPlaying = payload.is_playing;
            const targetPos = getAccuratePlaybackPosition(payload.position, isPlaying, serverTime);
            alignPlaybackDrift(targetPos, isPlaying);
        }
    } else if (event === 'MEMBER_JOINED') {
        if (payload.member) {
            const exists = (state.room.members || []).some(m => (m.id || m.client_id) === (payload.member.id || payload.member.client_id));
            if (!exists) {
                state.room.members.push(payload.member);
            }
            renderRoomHeader();
            renderRoomMembers();
            appendChatMessage('System', `${payload.member.name} joined the room 👋`, false, true);
        }
    } else if (event === 'MEMBER_LEFT') {
        const leftId = payload.member_id;
        state.room.members = (state.room.members || []).filter(m => (m.id || m.client_id) !== leftId);

        if (payload.new_host_id) {
            state.room.hostId = payload.new_host_id;
            state.room.hostName = payload.new_host_name;
            state.room.isHost = (state.room.clientId === payload.new_host_id);
            state.room.members.forEach(m => {
                m.is_host = ((m.id || m.client_id) === payload.new_host_id);
            });
            appendChatMessage('System', `👑 ${payload.new_host_name} is now the Room Host`, false, true);
            if (state.room.isHost) {
                showToast('👑 You are now the Room Host! You control playback for everyone.');
            }
        }

        renderRoomHeader();
        renderRoomMembers();
        if (payload.member_name) {
            appendChatMessage('System', `${payload.member_name} left the room`, false, true);
        }
    } else if (event === 'CHAT_BROADCAST') {
        appendChatMessage(payload.sender, payload.text, payload.sender === state.room.name, false);
    } else if (event === 'REACTION_BROADCAST') {
        appendChatMessage(payload.sender, `reacted with ${payload.reaction}`, payload.sender === state.room.name, true);
        triggerFloatingEmoji(payload.reaction);
    } else if (event === 'QUEUE_SYNC') {
        state.room.queue = payload.queue || [];
        renderRoomQueue();
    } else if (event === 'KICKED') {
        showToast(payload.message || 'You have been removed from the room by the host.', 4000);
        leaveRoom(false);
    }
}

// 5. Synchronized Song Loader & Playback Starter
function syncSongPlayback(song, position, isPlaying, serverTime) {
    if (!song) return;
    registerSong(song);
    state.room.currentSong = song;

    const isDifferentSong = !state.currentSong || String(state.currentSong.id) !== String(song.id);

    state.currentSong = song;
    setPlayerMetadata(song);
    updateRoomNowPlayingUI();

    let audioSrc = (!song.audio_url || song.audio_url.includes('soundhelix') || !song.audio_url.startsWith('http'))
        ? `/api/stream-audio/${song.id}`
        : song.audio_url;
    song.audio_url = audioSrc;

    const targetPos = getAccuratePlaybackPosition(position, isPlaying, serverTime);

    state.room.isSyncing = true;

    if (isDifferentSong || !audio.src || !audio.src.includes(song.id)) {
        audio.src = audioSrc;
    }

    const applyPlayback = () => {
        audio.playbackRate = 1.0;
        if (targetPos > 0 && Math.abs(audio.currentTime - targetPos) > 0.4) {
            try { audio.currentTime = targetPos; } catch(e) {}
        }
        if (isPlaying) {
            audio.play().then(() => {
                state.isPlaying = true;
                updatePlayIcons();
                updateRoomVisualizer();
                hideAudioUnlockOverlay();
                updateRoomStageActionBtn();
            }).catch(err => {
                console.warn('Sync audio play error (Autoplay restricted):', err);
                showAudioUnlockOverlay();
                updateRoomStageActionBtn();
            }).finally(() => {
                state.room.isSyncing = false;
            });
        } else {
            audio.currentTime = targetPos;
            audio.pause();
            state.isPlaying = false;
            updatePlayIcons();
            updateRoomVisualizer();
            state.room.isSyncing = false;
            hideAudioUnlockOverlay();
            updateRoomStageActionBtn();
        }
    };

    if (audio.readyState >= 1) {
        applyPlayback();
    } else {
        const onLoaded = () => {
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('canplay', onLoaded);
            applyPlayback();
        };
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('canplay', onLoaded);
        if (isPlaying) {
            audio.play().catch(() => {});
        }
    }
}

// 6. Room View Renderers
function renderRoomView() {
    if (!state.room.code) {
        roomLobby.classList.remove('hidden');
        roomActive.classList.add('hidden');
        fetchActiveRooms();
    } else {
        roomLobby.classList.add('hidden');
        roomActive.classList.remove('hidden');
        renderRoomHeader();
        renderRoomMembers();
        renderRoomQueue();
        renderRoomQuickSongs();
        updateRoomNowPlayingUI();
    }
    updateBottomRoomIndicator();
}

function renderRoomHeader() {
    if (activeRoomCodeDisplay) activeRoomCodeDisplay.innerText = state.room.code || '------';
    if (activeRoomRoleBadge) {
        if (state.room.isHost) {
            activeRoomRoleBadge.className = 'room-role-badge';
            activeRoomRoleBadge.innerHTML = '<i class="fa-solid fa-crown"></i> Host (👑 DJ)';
        } else {
            activeRoomRoleBadge.className = 'room-role-badge member';
            activeRoomRoleBadge.innerHTML = '<i class="fa-solid fa-headphones"></i> Listener (Synced)';
        }
    }
    const count = (state.room.members && state.room.members.length) || 1;
    if (activeRoomListenersCount) {
        activeRoomListenersCount.innerHTML = `<i class="fa-solid fa-users"></i> ${count} listener${count === 1 ? '' : 's'}`;
    }
    if (roomMemberCountBadge) {
        roomMemberCountBadge.innerText = `${count} Online`;
    }
    if (roomControlNoticeText) {
        roomControlNoticeText.innerText = '✨ Jukebox Sync: Any member can pick songs or play/pause to sync live for everyone in this room!';
    }
}

function renderRoomMembers() {
    if (!roomMembersList) return;
    const members = state.room.members || [];

    if (members.length === 0) {
        roomMembersList.innerHTML = '<div class="empty-state-sm">No members connected.</div>';
        return;
    }

    roomMembersList.innerHTML = members.map(m => {
        const isMe = m.client_id === state.room.clientId;
        const initial = (m.name || 'U').charAt(0).toUpperCase();
        const rolePill = m.is_host ? '<span class="member-pill host">👑 Host</span>' : '<span class="member-pill listener">🎧 Listener</span>';
        const kickBtn = (state.room.isHost && !m.is_host) 
            ? `<button class="member-kick-btn" onclick="kickMember('${escapeHtml(m.client_id)}')" title="Remove member"><i class="fa-solid fa-user-xmark"></i></button>` 
            : '';

        return `
            <div class="room-member-row">
                <div class="member-left">
                    <div class="member-avatar">${initial}</div>
                    <div class="member-name">${escapeHtml(m.name)}${isMe ? ' (You)' : ''}</div>
                </div>
                <div class="member-badges">
                    ${rolePill}
                    ${kickBtn}
                </div>
            </div>
        `;
    }).join('');
}

function renderRoomQueue() {
    if (!roomQueueList) return;
    const queue = state.room.queue || [];
    if (roomQueueCount) roomQueueCount.innerText = `${queue.length} songs`;

    if (queue.length === 0) {
        roomQueueList.innerHTML = '<div class="empty-state-sm">Queue is empty. Select any song to play!</div>';
        return;
    }

    roomQueueList.innerHTML = queue.map((s, idx) => `
        <div class="room-queue-item">
            <span class="row-rank">${idx + 1}</span>
            <img src="${s.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150'}" class="room-queue-thumb" />
            <div class="room-queue-info">
                <h6>${escapeHtml(s.title)}</h6>
                <p>${escapeHtml(s.artist)}</p>
            </div>
        </div>
    `).join('');
}

function updateRoomNowPlayingUI() {
    const song = state.room.currentSong || state.currentSong;
    if (song) {
        if (roomTrackCover) roomTrackCover.src = song.thumbnail || 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300';
        if (roomTrackTitle) roomTrackTitle.innerText = song.title;
        if (roomTrackArtist) roomTrackArtist.innerText = song.artist;
    } else {
        if (roomTrackTitle) roomTrackTitle.innerText = 'Select a song to play';
        if (roomTrackArtist) roomTrackArtist.innerText = 'Tap any song to start room playback';
    }
    updateRoomVisualizer();
    updateRoomStageActionBtn();
}

function updateRoomVisualizer() {
    if (!roomVisualizer) return;
    if (state.isPlaying && !audio.paused) {
        roomVisualizer.classList.remove('eq-paused');
    } else {
        roomVisualizer.classList.add('eq-paused');
    }
}

const roomStageActionBtn = document.getElementById('room-stage-action-btn');
const roomQuickSongsList = document.getElementById('room-quick-songs-list');

function updateRoomStageActionBtn() {
    if (!roomStageActionBtn) return;
    roomStageActionBtn.className = 'stage-action-btn';
    if (state.isPlaying && !audio.paused) {
        roomStageActionBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pause for Room</span>';
    } else {
        const hasSong = state.room.currentSong || state.currentSong;
        roomStageActionBtn.innerHTML = `<i class="fa-solid fa-play"></i> <span>${hasSong ? 'Play for Room' : 'Start Music'}</span>`;
    }
}

if (roomStageActionBtn) {
    roomStageActionBtn.addEventListener('click', () => {
        togglePlayPause();
    });
}

function renderRoomQuickSongs() {
    if (!roomQuickSongsList) return;
    const songs = (state.trendingSongs && state.trendingSongs.length > 0) ? state.trendingSongs : state.playlist;
    if (!songs || songs.length === 0) {
        roomQuickSongsList.innerHTML = '<div class="empty-state-sm">Loading songs...</div>';
        return;
    }

    roomQuickSongsList.innerHTML = songs.slice(0, 10).map((s, idx) => `
        <div class="room-quick-song-row" onclick="playSongInRoom('${escapeHtml(s.id)}')">
            <img src="${s.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120'}" class="room-quick-song-thumb" />
            <div class="room-quick-song-info">
                <h6>${escapeHtml(s.title)}</h6>
                <p>${escapeHtml(s.artist)}</p>
            </div>
            <span class="room-quick-play-badge">
                <i class="fa-solid fa-play"></i> Play
            </span>
        </div>
    `).join('');
}

window.playSongInRoom = function(songId) {
    const song = songMap.get(String(songId)) || (state.trendingSongs && state.trendingSongs.find(s => String(s.id) === String(songId)));
    if (song) {
        playSong(song, 0, state.trendingSongs);
        showToast(`▶ Playing "${song.title}" for Room!`);
    }
};

function updateBottomRoomIndicator() {
    if (!bottomRoomIndicator) return;
    if (state.room.code) {
        bottomRoomIndicator.classList.remove('hidden');
        const role = state.room.isHost ? 'Host' : 'Listener';
        if (bottomRoomStatus) {
            bottomRoomStatus.innerText = `Room: ${state.room.code} (${role})`;
        }
    } else {
        bottomRoomIndicator.classList.add('hidden');
    }
}

// 7. Chat & Reactions Handling
function appendChatMessage(sender, text, isMine, isSystem) {
    if (!roomChatMessages) return;

    if (isSystem) {
        const sys = document.createElement('div');
        sys.className = 'chat-system-msg';
        sys.innerText = text;
        roomChatMessages.appendChild(sys);
    } else {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;
        bubble.innerHTML = `
            <div class="chat-sender">${escapeHtml(sender)}</div>
            <div>${escapeHtml(text)}</div>
        `;
        roomChatMessages.appendChild(bubble);
    }

    roomChatMessages.scrollTop = roomChatMessages.scrollHeight;
}

if (roomChatForm) {
    roomChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = (roomChatInput.value || '').trim();
        if (!text) return;

        broadcastRoomEvent({
            event: 'CHAT_MSG',
            action: 'CHAT_MSG',
            text: text,
            sender_name: state.room.name
        });
        roomChatInput.value = '';
    });
}

// Quick Emoji Reactions
document.querySelectorAll('.reaction-pill').forEach(btn => {
    btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        if (emoji && state.room.code) {
            broadcastRoomEvent({
                event: 'REACTION',
                action: 'REACTION',
                reaction: emoji,
                emoji: emoji,
                sender_name: state.room.name
            });
            triggerFloatingEmoji(emoji);
        }
    });
});

function triggerFloatingEmoji(emoji) {
    const el = document.createElement('div');
    el.innerText = emoji;
    el.style.position = 'fixed';
    el.style.left = `${Math.random() * 40 + 30}%`;
    el.style.bottom = '100px';
    el.style.fontSize = '2.4rem';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    el.style.transition = 'all 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    document.body.appendChild(el);

    requestAnimationFrame(() => {
        el.style.transform = `translateY(-180px) scale(1.4)`;
        el.style.opacity = '0';
    });

    setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 1500);
}

// 8. Room Actions: Copy, Share, Leave, Kick
if (roomCopyCodeBtn) {
    roomCopyCodeBtn.addEventListener('click', () => {
        if (state.room.code) {
            navigator.clipboard.writeText(state.room.code).then(() => {
                showToast(`📋 Room Code "${state.room.code}" copied to clipboard!`);
            }).catch(() => {
                showToast(`Room Code: ${state.room.code}`);
            });
        }
    });
}

if (roomShareLinkBtn) {
    roomShareLinkBtn.addEventListener('click', () => {
        if (state.room.code) {
            const shareUrl = `${window.location.origin}${window.location.pathname}?room=${state.room.code}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast(`🔗 Invite link copied: ${shareUrl}`);
            }).catch(() => {
                showToast(`Invite URL: ${shareUrl}`);
            });
        }
    });
}

function leaveRoom(notifyServer = true) {
    if (notifyServer && state.room.ws && state.room.ws.readyState === WebSocket.OPEN) {
        try {
            state.room.ws.send(JSON.stringify({ event: 'LEAVE_ROOM', data: {} }));
        } catch (e) {}
    }
    if (state.room.ws) {
        state.room.ws.close();
        state.room.ws = null;
    }
    state.room.code = null;
    state.room.isHost = false;
    state.room.members = [];
    state.room.queue = [];
    state.room.currentSong = null;

    updateRoomUrl(null);
    renderRoomView();
    showToast('Left the Music Room.');
}

if (roomLeaveBtn) {
    roomLeaveBtn.addEventListener('click', () => {
        leaveRoom(true);
    });
}

window.kickMember = function(memberId) {
    if (state.room.isHost && memberId) {
        broadcastRoomEvent({
            action: 'KICK_MEMBER',
            target_client_id: memberId
        });
        showToast('Member removed from room.');
    }
};

function updateRoomUrl(roomCode) {
    const url = new URL(window.location.href);
    if (roomCode) {
        url.searchParams.set('room', roomCode);
    } else {
        url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url.toString());
}

// Active Rooms Section Logic
const activeRoomsGrid = document.getElementById('active-rooms-grid');
const refreshActiveRoomsBtn = document.getElementById('refresh-active-rooms-btn');
const audioUnlockOverlay = document.getElementById('audio-unlock-overlay');
const audioUnlockBtn = document.getElementById('audio-unlock-btn');

function showAudioUnlockOverlay() {
    if (audioUnlockOverlay) audioUnlockOverlay.classList.remove('hidden');
}

function hideAudioUnlockOverlay() {
    if (audioUnlockOverlay) audioUnlockOverlay.classList.add('hidden');
}

if (audioUnlockBtn) {
    audioUnlockBtn.addEventListener('click', () => {
        audio.play().then(() => {
            state.isPlaying = true;
            updatePlayIcons();
            updateRoomVisualizer();
            hideAudioUnlockOverlay();
            showToast('🔊 Audio enabled & synced with Host!');
        }).catch(err => {
            console.error('Audio unlock tap failed:', err);
        });
    });
}

async function fetchActiveRooms() {
    if (!activeRoomsGrid) return;
    try {
        const res = await fetch('/api/rooms/active');
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
            if (data.rooms.length === 0) {
                activeRoomsGrid.innerHTML = `
                    <div class="no-rooms-notice">
                        <i class="fa-solid fa-signal" style="margin-right: 6px; color: var(--text-secondary);"></i>
                        Abhi koi doosra room open nahi hai. Pehle <strong>"+ Create New Room"</strong> dabayein ya Host se code poochein!
                    </div>
                `;
            } else {
                activeRoomsGrid.innerHTML = data.rooms.map(r => `
                    <div class="active-room-card">
                        <div class="active-room-card-head">
                            <span class="active-room-code-badge">${escapeHtml(r.code)}</span>
                            <span class="active-room-listeners-badge"><i class="fa-solid fa-users"></i> ${r.member_count} listener${r.member_count === 1 ? '' : 's'}</span>
                        </div>
                        <div class="active-room-host">👑 Host: ${escapeHtml(r.host_name)}</div>
                        <div class="active-room-song">
                            <i class="fa-solid fa-music"></i> ${r.current_song ? escapeHtml(r.current_song.title) : 'Standing by (No song yet)'}
                        </div>
                        <button class="quick-join-room-btn" onclick="joinRoomByCode('${escapeHtml(r.code)}')">
                            <i class="fa-solid fa-right-to-bracket"></i> Join Room (${escapeHtml(r.code)})
                        </button>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.warn('Failed to load active rooms:', e);
    }
}

if (refreshActiveRoomsBtn) {
    refreshActiveRoomsBtn.addEventListener('click', () => {
        fetchActiveRooms();
        showToast('Refreshing live rooms...');
    });
}

// Periodic refresh of active rooms every 12 seconds when on room lobby
setInterval(() => {
    if (state.currentView === 'room' && !state.room.code) {
        fetchActiveRooms();
    }
}, 12000);

function checkUrlForRoomInvite() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        const cleanCode = parseRoomCode(roomCode);
        if (cleanCode && cleanCode.length >= 4) {
            if (joinRoomCodeInput) joinRoomCodeInput.value = cleanCode;
            showView('room');
            showToast(`🔗 Invite link detected for Room ${cleanCode}! Auto-connecting...`, 3000);
            window.joinRoomByCode(cleanCode, state.room.name, true);
        }
    }
}

// Check room invite immediately upon load!
checkUrlForRoomInvite();
fetchActiveRooms();

// Start Application
bootstrapApp();
