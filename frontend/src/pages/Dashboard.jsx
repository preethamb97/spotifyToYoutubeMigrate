import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PlaylistCard from '../components/PlaylistCard';

export default function Dashboard({ user, onRefresh }) {
  const navigate = useNavigate();
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [youtubePlaylists, setYoutubePlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState(new Set());
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [mode, setMode] = useState('new');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedYoutubePlaylist, setSelectedYoutubePlaylist] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user.hasSpotify) {
      fetchSpotifyPlaylists();
    }
  }, [user]);

  useEffect(() => {
    if (mode === 'existing' && user.hasGoogle) {
      fetchYoutubePlaylists();
    }
  }, [mode, user]);

  const fetchSpotifyPlaylists = async () => {
    setLoadingSpotify(true);
    setError('');
    try {
      const response = await api.get('/api/spotify/playlists');
      const playlists = response.data?.data?.playlists || response.data?.playlists || [];
      setSpotifyPlaylists(playlists);
    } catch (err) {
      setError('Failed to load Spotify playlists');
      console.error(err);
    } finally {
      setLoadingSpotify(false);
    }
  };

  const fetchYoutubePlaylists = async () => {
    setLoadingYoutube(true);
    try {
      const response = await api.get('/api/youtube/playlists');
      const playlists = response.data?.data?.playlists || response.data?.playlists || [];
      setYoutubePlaylists(playlists);
    } catch (err) {
      console.error('Failed to load YouTube playlists:', err);
    } finally {
      setLoadingYoutube(false);
    }
  };

  const togglePlaylist = (playlistId) => {
    setSelectedPlaylists((prev) => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  };

  const handleMigrate = async () => {
    if (selectedPlaylists.size === 0) {
      setError('Select at least one playlist to migrate');
      return;
    }

    if (mode === 'new' && !newPlaylistName.trim()) {
      setError('Enter a name for the new YouTube playlist');
      return;
    }

    if (mode === 'existing' && !selectedYoutubePlaylist) {
      setError('Select a YouTube playlist');
      return;
    }

    setError('');
    setSuccess('');
    setMigrating(true);

    try {
      const playlistIds = Array.from(selectedPlaylists);
      let lastJobId = null;

      for (const spotifyPlaylistId of playlistIds) {
        const playlist = spotifyPlaylists.find((p) => p.id === spotifyPlaylistId);
        const playlistName = playlist ? playlist.name : 'Playlist';

        const body = {
          spotifyPlaylistId,
          spotifyPlaylistName: playlistName,
        };

        if (mode === 'new') {
          body.newYoutubePlaylistName =
            playlistIds.length > 1
              ? `${newPlaylistName} - ${playlistName}`
              : newPlaylistName;
        } else {
          body.youtubePlaylistId = selectedYoutubePlaylist;
        }

        const response = await api.post('/api/migrate', body);
        const jobId = response.data?.data?.jobId || response.data?.jobId;
        lastJobId = jobId;
      }

      setSuccess(`Migration started for ${playlistIds.length} playlist(s)!`);
      setSelectedPlaylists(new Set());

      if (lastJobId) {
        navigate(`/migrate/${lastJobId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start migration');
      console.error(err);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">🎵</span>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              Playlist<span className="text-spotify-green">Bridge</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
            )}
            <span className="text-gray-300 text-xs sm:text-sm hidden sm:block">{user.displayName}</span>
            <a
              href="/auth/logout"
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors"
            >
              Logout
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-900/50 border border-red-700 text-red-200 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 sm:mb-6 bg-green-900/50 border border-green-700 text-green-200 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm" role="alert">
            {success}
          </div>
        )}

        {!user.hasSpotify && (
          <div className="mb-4 sm:mb-6 bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-3 sm:px-4 py-2 sm:py-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm sm:text-base">Connect your Spotify account</span>
            </div>
            <a
              href="/auth/spotify"
              className="bg-spotify-green hover:bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors"
            >
              Connect Spotify
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          <section aria-labelledby="spotify-heading">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 id="spotify-heading" className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-spotify-green" aria-hidden="true">●</span> Your Spotify Playlists
              </h2>
              <button
                onClick={fetchSpotifyPlaylists}
                disabled={loadingSpotify}
                className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                {loadingSpotify ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingSpotify && spotifyPlaylists.length === 0 ? (
              <div className="text-gray-400 text-center py-8 sm:py-12 text-sm">
                Loading playlists...
              </div>
            ) : spotifyPlaylists.length === 0 ? (
              <div className="text-gray-400 text-center py-8 sm:py-12 text-sm">
                No playlists found. Connect your Spotify account.
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
                {spotifyPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    isSelected={selectedPlaylists.has(playlist.id)}
                    onToggle={() => togglePlaylist(playlist.id)}
                    onExport={(format) => {
                      window.open(`/api/export/${playlist.id}?format=${format}`, '_blank');
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="youtube-heading">
            <h2 id="youtube-heading" className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-3 sm:mb-4">
              <span className="text-youtube-red" aria-hidden="true">●</span> YouTube Destination
            </h2>

            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
              <fieldset>
                <legend className="sr-only">Playlist mode</legend>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="yt-mode"
                      value="new"
                      checked={mode === 'new'}
                      onChange={() => setMode('new')}
                      className="accent-spotify-green"
                    />
                    <span className="text-gray-300 text-sm">Create new playlist</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="yt-mode"
                      value="existing"
                      checked={mode === 'existing'}
                      onChange={() => setMode('existing')}
                      className="accent-spotify-green"
                    />
                    <span className="text-gray-300 text-sm">Use existing</span>
                  </label>
                </div>
              </fieldset>

              {mode === 'new' ? (
                <div>
                  <label htmlFor="new-playlist-name" className="block text-gray-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    New YouTube playlist name
                  </label>
                  <input
                    id="new-playlist-name"
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. My Migrated Spotify Playlist"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-gray-500 focus:outline-none focus:border-spotify-green transition-colors text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="existing-playlist" className="block text-gray-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Select existing YouTube playlist
                  </label>
                  {loadingYoutube ? (
                    <div className="text-gray-500 text-sm">Loading playlists...</div>
                  ) : (
                    <select
                      id="existing-playlist"
                      value={selectedYoutubePlaylist}
                      onChange={(e) => setSelectedYoutubePlaylist(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:outline-none focus:border-spotify-green transition-colors text-sm"
                    >
                      <option value="">— Select playlist —</option>
                      {youtubePlaylists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.title} ({pl.itemCount} videos)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                onClick={handleMigrate}
                disabled={
                  migrating ||
                  selectedPlaylists.size === 0 ||
                  !user.hasGoogle ||
                  !user.hasSpotify ||
                  (mode === 'new' && !newPlaylistName.trim()) ||
                  (mode === 'existing' && !selectedYoutubePlaylist)
                }
                className="w-full bg-spotify-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-colors duration-200 text-base sm:text-lg"
              >
                {migrating
                  ? 'Starting migration...'
                  : `Migrate ${selectedPlaylists.size} playlist(s) to YouTube`}
              </button>

              <p className="text-gray-500 text-xs text-center">
                YouTube quota: ~200 video inserts per day per user
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}