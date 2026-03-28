import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import MigrationProgress from '../components/MigrationProgress';

export default function Migrate({ user }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  const fetchStatus = async () => {
    try {
      const response = await api.get(`/api/migrate/${jobId}/status`);
      const jobData = response.data?.data || response.data;
      setJob(jobData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load migration status');
      setLoading(false);
      console.error(err);
    }
  };

  const handleExport = (format) => {
    window.open(`/api/export/migration/${jobId}?format=${format}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm sm:text-base">Loading migration status...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-400 mb-4 text-sm sm:text-base">{error || 'Migration not found'}</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-spotify-green hover:underline text-sm sm:text-base"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors"
            >
              Back to Dashboard
            </button>
            <a
              href="/auth/logout"
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors"
            >
              Logout
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
            {job.spotifyPlaylistName || 'Migration'}
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            Migrating to: {job.youtubePlaylistName || 'New YouTube Playlist'}
          </p>
        </div>

        <MigrationProgress job={job} />

        {(job.status === 'done' || job.status === 'failed') && (
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => handleExport('csv')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base"
            >
              Download Results CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base"
            >
              Download Results JSON
            </button>
          </div>
        )}
      </main>
    </div>
  );
}