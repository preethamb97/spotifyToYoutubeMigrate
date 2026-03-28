import React from 'react';

export default function ExportMenu({ playlistId, onClose, onExport }) {
  return (
    <div 
      className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-[160px] sm:min-w-[180px]"
      role="menu"
      aria-label="Export options"
    >
      <button
        onClick={() => onExport('json')}
        className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-gray-300 hover:bg-gray-700 hover:text-white text-xs sm:text-sm transition-colors rounded-t-lg"
        role="menuitem"
      >
        Export as JSON
      </button>
      <button
        onClick={() => onExport('csv')}
        className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 text-gray-300 hover:bg-gray-700 hover:text-white text-xs sm:text-sm transition-colors rounded-b-lg"
        role="menuitem"
      >
        Export as CSV
      </button>
    </div>
  );
}