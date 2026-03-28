import React, { useState } from 'react';
import ExportMenu from './ExportMenu';

export default function PlaylistCard({ playlist, isSelected, onToggle, onExport }) {
  const [showExport, setShowExport] = useState(false);

  return (
    <article
      className={`relative bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-4 border-2 transition-colors cursor-pointer ${
        isSelected ? 'border-spotify-green bg-gray-800' : 'border-transparent hover:border-gray-600'
      }`}
      onClick={onToggle}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${playlist.name} - ${playlist.trackCount} tracks`}
    >
      <div
        className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected ? 'bg-spotify-green border-spotify-green' : 'border-gray-500'
        }`}
        aria-hidden="true"
      >
        {isSelected && (
          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {playlist.imageUrl ? (
        <img
          src={playlist.imageUrl}
          alt=""
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <span className="text-lg sm:text-2xl">🎵</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium text-sm sm:text-base truncate">{playlist.name}</h3>
        <p className="text-gray-400 text-xs sm:text-sm">
          {playlist.trackCount} track{playlist.trackCount !== 1 ? 's' : ''}
          {playlist.owner && ` • ${playlist.owner}`}
        </p>
      </div>

      <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setShowExport(!showExport)}
          className="text-gray-400 hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-gray-700 transition-colors"
          title="Export playlist"
          aria-label="Export playlist options"
          aria-expanded={showExport}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        {showExport && (
          <ExportMenu
            playlistId={playlist.id}
            onClose={() => setShowExport(false)}
            onExport={(format) => {
              onExport(format);
              setShowExport(false);
            }}
          />
        )}
      </div>
    </article>
  );
}