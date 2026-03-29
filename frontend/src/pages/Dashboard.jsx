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
  const [connectingSpotify, setConnectingSpotify] = useState(false);

  useEffect(() => {
    if (user.hasSpotify) {
      fetchSpotifyPlaylists();
    } else {
      // Attempt to automatically connect Spotify
      attemptAutoConnectSpotify();
    }
  }, [user]);

  useEffect(() => {
    if (mode === 'existing' && user.hasGoogle) {
      fetchYoutubePlaylists();
    }
  }, [mode, user]);

  // Check for OAuth callback code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !user.hasSpotify) {
      // Exchange code for tokens automatically
      exchangeCodeForTokens(code);
    }
  }, [user]);

  const exchangeCodeForTokens = async (code) => {
    setConnectingSpotify(true);
    setError('');
    
    try {
      const response = await api.post('/auth/spotify/exchange', { code });
      
      if (response.data?.success) {
        setSuccess('Spotify connected successfully!');
        // Refresh to update user state
        window.location.href = '/dashboard';
      } else {
        setError('Failed to connect Spotify. Please try again.');
      }
    } catch (err) {
      console.error('Token exchange error:', err);
      setError('Failed to connect Spotify. Please try again.');
    } finally {
      setConnectingSpotify(false);
    }
  };

  const attemptAutoConnectSpotify = async () => {
    setConnectingSpotify(true);
    try {
      // Try to get Spotify auth URL and check if user is already authenticated
      const response = await api.get('/auth/spotify/status');
      if (response.data?.authenticated) {
        // User is already authenticated, refresh the page
        window.location.reload();
      } else {
        // Automatically initiate OAuth flow
        window.location.href = '/auth/spotify';
      }
    } catch (err) {
      // Not authenticated, redirect to Spotify OAuth
      console.log('Auto-connect initiated, redirecting to Spotify...');
      window.location.href = '/auth/spotify';
    }
  };

  const handleLogout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/';
    }
  };

  const handleSpotifyConnect = async () => {
    setConnectingSpotify(true);
    setError('');
    
    try {
      // Redirect to Spotify OAuth
      window.location.href = '/auth/spotify';
    } catch (err) {
      setError('Failed to connect to Spotify. Please try again.');
      setConnectingSpotify(false);
    }
  };

  const fetchSpotifyPlaylists = async () => {
    setLoadingSpotify(true);
    setError('');
    try {
      const response = await api.get('/api/spotify/playlists');
      const playlists = response.data?.data?.playlists || response.data?.playlists || [];
      setSpotifyPlaylists(playlists);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Spotify connection expired. Please reconnect.');
      } else {
        setError('Failed to load Spotify playlists');
      }
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
            {user.hasSpotify && (
              <a
                href="/export"
                className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </a>
            )}
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
            )}
            <span className="text-gray-300 text-xs sm:text-sm hidden sm:block">{user.displayName}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors"
            >
              Logout
            </button>
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
          <div className="mb-6 sm:mb-8 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-spotify-green rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Connect your Spotify account</h2>
                <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-0">
                  Link your Spotify to view playlists and start migrating your music to YouTube
                </p>
              </div>
              <button
                onClick={handleSpotifyConnect}
                disabled={connectingSpotify}
                className="w-full sm:w-auto bg-spotify-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 sm:py-4 rounded-xl text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              >
                {connectingSpotify ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Connect Spotify
                  </>
                )}
              </button>
            </div>
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