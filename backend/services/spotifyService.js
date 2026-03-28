const axios = require('axios');
const User = require('../models/User');
const { createModuleLogger } = require('../config/logger');

const log = createModuleLogger('spotify-service');
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

/**
 * Refresh Spotify access token if expired
 */
async function ensureValidToken(user) {
  if (!user.spotifyTokenExpiry || !user.spotifyRefreshToken) {
    return user;
  }

  // Refresh if token expires within 60 seconds
  if (user.spotifyTokenExpiry < Date.now() + 60000) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', user.spotifyRefreshToken);

      const basicAuth = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64');

      const response = await axios.post(SPOTIFY_TOKEN_URL, params, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, expires_in, refresh_token } = response.data;

      user.spotifyAccessToken = access_token;
      user.spotifyTokenExpiry = Date.now() + expires_in * 1000;
      if (refresh_token) {
        user.spotifyRefreshToken = refresh_token;
      }

      await User.findByIdAndUpdate(user._id, {
        spotifyAccessToken: user.spotifyAccessToken,
        spotifyRefreshToken: user.spotifyRefreshToken,
        spotifyTokenExpiry: user.spotifyTokenExpiry,
      });

      log.info({ userId: user._id }, 'Spotify token refreshed successfully');
    } catch (error) {
      log.error({ err: error, userId: user._id }, 'Failed to refresh Spotify token');
      throw new Error('Failed to refresh Spotify token. Please reconnect Spotify.');
    }
  }

  return user;
}

/**
 * Get user's Spotify playlists
 */
async function getUserPlaylists(user) {
  user = await ensureValidToken(user);

  const playlists = [];
  let url = `${SPOTIFY_API_BASE}/me/playlists?limit=50`;

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${user.spotifyAccessToken}` },
    });

    const data = response.data;
    for (const item of data.items) {
      playlists.push({
        id: item.id,
        name: item.name,
        trackCount: item.tracks.total,
        imageUrl: item.images && item.images[0] ? item.images[0].url : null,
        owner: item.owner.display_name,
        isPublic: item.public,
      });
    }

    url = data.next; // null when no more pages
  }

  return playlists;
}

/**
 * Get all tracks from a Spotify playlist (handles pagination)
 */
async function getPlaylistTracks(user, playlistId) {
  user = await ensureValidToken(user);

  const tracks = [];
  let url = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,artists,album(name))),next`;

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${user.spotifyAccessToken}` },
    });

    const data = response.data;
    for (const item of data.items) {
      if (item.track && item.track.id) {
        tracks.push({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map((a) => a.name).join(', '),
          albumName: item.track.album ? item.track.album.name : '',
        });
      }
    }

    url = data.next;
  }

  return tracks;
}

module.exports = {
  getUserPlaylists,
  getPlaylistTracks,
  ensureValidToken,
};
