const axios = require('axios');
const { createModuleLogger } = require('../config/logger');

const log = createModuleLogger('youtube-service');
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Get user's YouTube playlists
 */
async function getUserPlaylists(user) {
  const playlists = [];
  let pageToken = '';

  do {
    const params = {
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50,
    };
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get(`${YOUTUBE_API_BASE}/playlists`, {
      params,
      headers: { Authorization: `Bearer ${user.googleAccessToken}` },
    });

    const data = response.data;
    for (const item of data.items || []) {
      playlists.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails?.default?.url || null,
        itemCount: item.contentDetails?.itemCount || 0,
      });
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return playlists;
}

/**
 * Create a new YouTube playlist
 */
async function createPlaylist(user, title, description = '') {
  const response = await axios.post(
    `${YOUTUBE_API_BASE}/playlists`,
    {
      snippet: {
        title,
        description: description || `Migrated from Spotify via MusicBridge`,
      },
      status: {
        privacyStatus: 'private',
      },
    },
    {
      params: { part: 'snippet,status' },
      headers: {
        Authorization: `Bearer ${user.googleAccessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    id: response.data.id,
    title: response.data.snippet.title,
  };
}

/**
 * Add a video to a YouTube playlist
 */
async function addVideoToPlaylist(user, playlistId, videoId) {
  const response = await axios.post(
    `${YOUTUBE_API_BASE}/playlistItems`,
    {
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId,
        },
      },
    },
    {
      params: { part: 'snippet' },
      headers: {
        Authorization: `Bearer ${user.googleAccessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

module.exports = {
  getUserPlaylists,
  createPlaylist,
  addVideoToPlaylist,
};
