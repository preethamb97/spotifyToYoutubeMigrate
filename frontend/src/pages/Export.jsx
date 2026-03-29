import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Export({ user }) {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user.hasSpotify) {
      fetchPlaylists();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPlaylists = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/spotify/playlists');
      const playlistsData = response.data?.data?.playlists || response.data?.playlists || [];
      setPlaylists(playlistsData);
    } catch (err) {
      setError('Failed to load Spotify playlists');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (playlistId, format) => {
    setExporting(prev => ({ ...prev, [playlistId]: format }));
    setError('');
    setSuccess('');

    try {
      const response = await api.get(`/api/export/${playlistId}?format=${format}`, {
        responseType: 'blob',
      });

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `playlist_${playlistId}.${format === 'json' ? 'json' : 'csv'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Successfully exported playlist as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Export error:', err);
      if (err.response?.data instanceof Blob) {
        // Try to read error message from blob
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.error || 'Export failed');
        } catch {
          setError('Export failed');
        }
      } else {
        setError(err.response?.data?.error || 'Failed to export playlist');
      }
    } finally {
      setExporting(prev => {
        const newState = { ...prev };
        delete newState[playlistId];
        return newState;
      });
    }
  };

  const handleExportAll = async (format) => {
    if (playlists.length === 0) {
      setError('No playlists to export');
      return;
    }

    setExporting({ all: format });
    setError('');
    setSuccess('');

    try {
      for (const playlist of playlists) {
        await handleExport(playlist.id, format);
        // Small delay between exports to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      setSuccess(`Successfully exported all ${playlists.length} playlists as ${format.toUpperCase()}`);
    } catch (err) {
      setError('Failed to export all playlists');
    } finally {
      setExporting(prev => {
        const newState = { ...prev };
        delete newState.all;
        return newState;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl sm:text-2xl">📥</span>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              Export <span className="text-spotify-green">Playlists</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
            )}
            <span className="text-gray-300 text-xs sm:text-sm hidden sm:block">{user.displayName}</span>
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

        {!user.hasSpotify ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎵</div>
            <h2 className="text-xl font-semibold text-white mb-2">Connect Spotify to Export</h2>
            <p className="text-gray-400 mb-6">Link your Spotify account to export your playlists</p>
            <a
              href="/auth/spotify"
              className="inline-flex items-center gap-2 bg-spotify-green hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Connect Spotify
            </a>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">Loading playlists...</div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-white mb-2">No Playlists Found</h2>
            <p className="text-gray-400 mb-6">Create some playlists on Spotify first</p>
            <button
              onClick={fetchPlaylists}
              className="text-spotify-green hover:text-green-400 transition-colors"
            >
              Refresh playlists
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => handleExportAll('csv')}
                disabled={exporting.all}
                className="bg-spotify-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                {exporting.all === 'csv' ? 'Exporting...' : 'Export All as CSV'}
              </button>
              <button
                onClick={() => handleExportAll('csv-full')}
                disabled={exporting.all}
                className="bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                {exporting.all === 'csv-full' ? 'Exporting...' : 'Export All as CSV (Full)'}
              </button>
              <button
                onClick={() => handleExportAll('json')}
                disabled={exporting.all}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                {exporting.all === 'json' ? 'Exporting...' : 'Export All as JSON'}
              </button>
            </div>

            <div className="mb-4 text-gray-400 text-sm">
              {playlists.length} playlist{playlists.length !== 1 ? 's' : ''} available for export
            </div>

            <div className="space-y-3">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-gray-800 rounded-xl p-4 flex items-center gap-4"
                >
                  {playlist.imageUrl ? (
                    <img
                      src={playlist.imageUrl}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🎵</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-base truncate">{playlist.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {playlist.trackCount} track{playlist.trackCount !== 1 ? 's' : ''}
                      {playlist.owner && ` • ${playlist.owner}`}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleExport(playlist.id, 'csv')}
                      disabled={exporting[playlist.id]}
                      className="bg-spotify-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                      title="Export as CSV"
                    >
                      {exporting[playlist.id] === 'csv' ? '...' : 'CSV'}
                    </button>
                    <button
                      onClick={() => handleExport(playlist.id, 'csv-full')}
                      disabled={exporting[playlist.id]}
                      className="bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                      title="Export as CSV with full details"
                    >
                      {exporting[playlist.id] === 'csv-full' ? '...' : 'Full'}
                    </button>
                    <button
                      onClick={() => handleExport(playlist.id, 'json')}
                      disabled={exporting[playlist.id]}
                      className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                      title="Export as JSON"
                    >
                      {exporting[playlist.id] === 'json' ? '...' : 'JSON'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-gray-800 rounded-xl p-4 sm:p-6">
              <h3 className="text-white font-semibold mb-3">Export Format Information</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <div>
                  <span className="text-spotify-green font-medium">CSV:</span> Basic track information (Track URI, Name, Artist, Album, Duration)
                </div>
                <div>
                  <span className="text-green-500 font-medium">CSV (Full):</span> Comprehensive data including popularity, release dates, ISRC codes, and more
                </div>
                <div>
                  <span className="text-gray-300 font-medium">JSON:</span> Complete track data in JSON format for programmatic use
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}