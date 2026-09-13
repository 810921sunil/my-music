# Curated hit songs, artists, and albums catalog matching the UI specification

TRENDING_SONGS = [
    {
        "id": "song_apna_bana_le",
        "search_query": "Apna Bana Le Bhediya Arijit Singh",
        "title": "Apna Bana Le",
        "artist": "Arijit Singh",
        "album": "Bhediya",
        "duration": 261,
        "duration_str": "4:21",
        "thumbnail": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/228/bed7fe5f8fe04ae6432bcb0717e2b74e_320.mp4",
        "category": "Romantic",
        "views": "12.4M plays"
    },
    {
        "id": "song_kesariya",
        "search_query": "Kesariya Brahmastra Arijit Singh",
        "title": "Kesariya",
        "artist": "Arijit Singh",
        "album": "Brahmastra",
        "duration": 268,
        "duration_str": "4:28",
        "thumbnail": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/871/c2febd353f3a076a406fa37510f31f9f_320.mp4",
        "category": "Romantic",
        "views": "28.1M plays"
    },
    {
        "id": "song_tum_hi_ho",
        "search_query": "Tum Hi Ho Aashiqui 2 Arijit Singh",
        "title": "Tum Hi Ho",
        "artist": "Arijit Singh",
        "album": "Aashiqui 2",
        "duration": 262,
        "duration_str": "4:22",
        "thumbnail": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/430/5c5ea5cc00e3bff45616013226f376fe_320.mp4",
        "category": "Sad",
        "views": "35.6M plays"
    },
    {
        "id": "song_faded",
        "search_query": "Faded Alan Walker",
        "title": "Faded",
        "artist": "Alan Walker",
        "album": "Different World",
        "duration": 212,
        "duration_str": "3:32",
        "thumbnail": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/562/b331b68fc5e35ff7d7cd7ce0e25158d7_320.mp4",
        "category": "Chill",
        "views": "45.2M plays"
    },
    {
        "id": "song_shape_of_you",
        "search_query": "Shape of You Ed Sheeran",
        "title": "Shape of You",
        "artist": "Ed Sheeran",
        "album": "Divide",
        "duration": 233,
        "duration_str": "3:53",
        "thumbnail": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/126/da7cde34b008294e181842062530546d_320.mp4",
        "category": "Party",
        "views": "58.9M plays"
    },
    {
        "id": "song_channa_mereya",
        "search_query": "Channa Mereya Ae Dil Hai Mushkil Arijit Singh",
        "title": "Channa Mereya",
        "artist": "Arijit Singh",
        "album": "Ae Dil Hai Mushkil",
        "duration": 289,
        "duration_str": "4:49",
        "thumbnail": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/597/6da0627cfcc4b937160f664841e4572d_320.mp4",
        "category": "Sad",
        "views": "19.3M plays"
    },
    {
        "id": "song_starboy",
        "search_query": "Starboy The Weeknd",
        "title": "Starboy",
        "artist": "The Weeknd",
        "album": "Starboy",
        "duration": 230,
        "duration_str": "3:50",
        "thumbnail": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/396/b4e570050007b056c662f2a98c9f28ec_320.mp4",
        "category": "Party",
        "views": "33.5M plays"
    },
    {
        "id": "song_lover",
        "search_query": "Lover Diljit Dosanjh",
        "title": "Lover",
        "artist": "Diljit Dosanjh",
        "album": "MoonChild Era",
        "duration": 195,
        "duration_str": "3:15",
        "thumbnail": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&q=80",
        "audio_url": "https://aac.saavncdn.com/209/88cd9a1cc0af8768d67272876bb09851_320.mp4",
        "category": "Romantic",
        "views": "24.1M plays"
    }
]

ARTISTS = [
    {
        "id": "art_arijit",
        "name": "Arijit Singh",
        "role": "Playback Singer",
        "monthly_listeners": "42M Monthly Listeners",
        "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
        "songs": ["song_apna_bana_le", "song_kesariya", "song_tum_hi_ho", "song_channa_mereya"]
    },
    {
        "id": "art_diljit",
        "name": "Diljit Dosanjh",
        "role": "Singer & Performer",
        "monthly_listeners": "28M Monthly Listeners",
        "image": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80",
        "songs": ["song_lover"]
    },
    {
        "id": "art_alan_walker",
        "name": "Alan Walker",
        "role": "DJ & Producer",
        "monthly_listeners": "35M Monthly Listeners",
        "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
        "songs": ["song_faded"]
    },
    {
        "id": "art_ed_sheeran",
        "name": "Ed Sheeran",
        "role": "Singer-Songwriter",
        "monthly_listeners": "68M Monthly Listeners",
        "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80",
        "songs": ["song_shape_of_you"]
    },
    {
        "id": "art_the_weeknd",
        "name": "The Weeknd",
        "role": "Singer & Icon",
        "monthly_listeners": "85M Monthly Listeners",
        "image": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80",
        "songs": ["song_starboy"]
    },
    {
        "id": "art_shreya",
        "name": "Shreya Ghoshal",
        "role": "Playback Singer",
        "monthly_listeners": "31M Monthly Listeners",
        "image": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
        "songs": ["song_kesariya"]
    }
]

ALBUMS = [
    {
        "id": "alb_brahmastra",
        "title": "Brahmāstra",
        "artist": "Pritam, Arijit Singh",
        "year": "2022",
        "songs_count": "6 Songs",
        "image": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
        "songs": ["song_kesariya"]
    },
    {
        "id": "alb_bhediya",
        "title": "Bhediya",
        "artist": "Sachin-Jigar, Arijit Singh",
        "year": "2022",
        "songs_count": "5 Songs",
        "image": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=400&q=80",
        "songs": ["song_apna_bana_le"]
    },
    {
        "id": "alb_aashiqui2",
        "title": "Aashiqui 2",
        "artist": "Mithoon, Ankit Tiwari, Jeet Gannguli",
        "year": "2013",
        "songs_count": "11 Songs",
        "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
        "songs": ["song_tum_hi_ho"]
    },
    {
        "id": "alb_divide",
        "title": "Divide (÷)",
        "artist": "Ed Sheeran",
        "year": "2017",
        "songs_count": "16 Songs",
        "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80",
        "songs": ["song_shape_of_you"]
    },
    {
        "id": "alb_starboy",
        "title": "Starboy",
        "artist": "The Weeknd",
        "year": "2016",
        "songs_count": "18 Songs",
        "image": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80",
        "songs": ["song_starboy"]
    },
    {
        "id": "alb_adhm",
        "title": "Ae Dil Hai Mushkil",
        "artist": "Pritam, Arijit Singh",
        "year": "2016",
        "songs_count": "8 Songs",
        "image": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
        "songs": ["song_channa_mereya"]
    }
]

def get_trending_songs():
    return TRENDING_SONGS

def get_artists():
    return ARTISTS

def get_albums():
    return ALBUMS
