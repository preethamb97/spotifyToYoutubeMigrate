import React from 'react';

export default function MigrationProgress({ job }) {
  const progressPercent = job.totalTracks > 0
    ? Math.round((job.processedTracks / job.totalTracks) * 100)
    : 0;

  const successCount = job.trackResults
    ? job.trackResults.filter((t) => t.status === 'success').length
    : 0;
  const notFoundCount = job.trackResults
    ? job.trackResults.filter((t) => t.status === 'not_found').length
    : 0;
  const failedCount = job.trackResults
    ? job.trackResults.filter((t) => t.status === 'failed').length
    : 0;

  const statusColors = {
    pending: 'text-yellow-400',
    running: 'text-blue-400',
    done: 'text-green-400',
    failed: 'text-red-400',
  };

  const statusLabels = {
    pending: 'Pending',
    running: 'Running',
    done: 'Completed',
    failed: 'Failed',
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`font-semibold text-base sm:text-lg ${statusColors[job.status]}`}>
              {statusLabels[job.status]}
            </span>
            {job.status === 'running' && (
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" aria-hidden="true" />
            )}
          </div>
          <span className="text-gray-400 text-xs sm:text-sm">
            {job.processedTracks} / {job.totalTracks} tracks
          </span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2.5 sm:h-3 overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100" aria-label="Migration progress">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              job.status === 'done'
                ? 'bg-green-500'
                : job.status === 'failed'
                ? 'bg-red-500'
                : 'bg-spotify-green'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-right text-gray-500 text-xs sm:text-sm mt-1">
          {progressPercent}%
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-400">{successCount}</div>
            <div className="text-gray-400 text-[10px] sm:text-xs">Migrated</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-yellow-400">{notFoundCount}</div>
            <div className="text-gray-400 text-[10px] sm:text-xs">Not Found</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-400">{failedCount}</div>
            <div className="text-gray-400 text-[10px] sm:text-xs">Failed</div>
          </div>
        </div>

        {job.errorMessage && (
          <div className="mt-3 sm:mt-4 bg-red-900/30 border border-red-700 text-red-200 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm" role="alert">
            {job.errorMessage}
          </div>
        )}
      </div>

      {job.trackResults && job.trackResults.length > 0 && (
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <h3 className="text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">Track Results</h3>
          <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto space-y-1.5 sm:space-y-2" role="list">
            {job.trackResults.map((track, index) => (
              <div
                key={index}
                className="flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-lg bg-gray-750 hover:bg-gray-700 transition-colors"
                role="listitem"
              >
                <div className="flex-shrink-0" aria-hidden="true">
                  {track.status === 'success' && (
                    <span className="text-green-400 text-base sm:text-lg">✓</span>
                  )}
                  {track.status === 'not_found' && (
                    <span className="text-yellow-400 text-base sm:text-lg">?</span>
                  )}
                  {track.status === 'failed' && (
                    <span className="text-red-400 text-base sm:text-lg">✗</span>
                  )}
                  {track.status === 'pending' && (
                    <span className="text-gray-500 text-base sm:text-lg">○</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs sm:text-sm truncate">{track.title}</div>
                  <div className="text-gray-400 text-[10px] sm:text-xs truncate">{track.artist}</div>
                </div>
                {track.youtubeVideoId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${track.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-youtube-red hover:text-red-300 text-[10px] sm:text-xs flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Watch ${track.title} on YouTube`}
                  >
                    YouTube
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}