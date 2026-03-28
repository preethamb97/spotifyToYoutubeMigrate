const BaseController = require('./BaseController');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const axios = require('axios');

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

/**
 * Spotify Controller - handles Spotify API integration
 */
class SpotifyController extends BaseController {
  constructor() {
    super('spotify-controller');
  }

  /**
   * Ensure Spotify token is valid, refresh if needed
   * @param {Object} user - User document
   * @returns {Promise<Object>} User with valid token
   */
  async ensureValidToken(user) {
    if (!user.spotifyTokenExpiry || !user.spotifyRefreshToken) {
      return user;
    }

    // Refresh if token expires within 60 seconds
    if (user.spotifyTokenExpiry < Date.now() + 60000) {
      const UserRepository = require('../repositories/UserRepository');
      const userRepo = new UserRepository();

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

      await userRepo.findByIdAndUpdate(user._id, {
        spotifyAccessToken: user.spotifyAccessToken,
        spotifyRefreshToken: user.spotifyRefreshToken,
        spotifyTokenExpiry: user.spotifyTokenExpiry,
      });

      this.logger.info({ userId: user._id }, 'Spotify token refreshed');
    }

    return user;
  }

  /**
   * Get user's Spotify playlists
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getPlaylists(req, res) {
    return this.asyncHandler(async (req, res) => {
      const user = await this.ensureValidToken(req.user);

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

        url = data.next;
      }

      this.logger.info({ userId: user._id, count: playlists.length }, 'Fetched Spotify playlists');
      this.sendSuccess(res, 'Playlists retrieved', { playlists });
    })(req, res);
  }

  /**
   * Get tracks from a Spotify playlist
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getPlaylistTracks(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { playlistId } = req.params;
      const user = await this.ensureValidToken(req.user);

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

      this.logger.info({ userId: user._id, playlistId, count: tracks.length }, 'Fetched playlist tracks');
      this.sendSuccess(res, 'Tracks retrieved', { tracks, total: tracks.length });
    })(req, res);
  }
}

module.exports = SpotifyController;