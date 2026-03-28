const BaseController = require('./BaseController');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const axios = require('axios');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * YouTube Controller - handles YouTube API integration
 */
class YouTubeController extends BaseController {
  constructor() {
    super('youtube-controller');
  }

  /**
   * Get user's YouTube playlists
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getPlaylists(req, res) {
    return this.asyncHandler(async (req, res) => {
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
          headers: { Authorization: `Bearer ${req.user.googleAccessToken}` },
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

      this.logger.info({ userId: req.user._id, count: playlists.length }, 'Fetched YouTube playlists');
      this.sendSuccess(res, 'Playlists retrieved', { playlists });
    })(req, res);
  }

  /**
   * Create a new YouTube playlist
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async createPlaylist(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { title, description } = req.body;

      this.validateRequired(req.body, ['title']);

      const response = await axios.post(
        `${YOUTUBE_API_BASE}/playlists`,
        {
          snippet: {
            title,
            description: description || 'Migrated from Spotify via PlaylistBridge',
          },
          status: {
            privacyStatus: 'private',
          },
        },
        {
          params: { part: 'snippet,status' },
          headers: {
            Authorization: `Bearer ${req.user.googleAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const playlist = {
        id: response.data.id,
        title: response.data.snippet.title,
      };

      this.logger.info({ userId: req.user._id, playlistId: playlist.id }, 'Created YouTube playlist');
      this.sendCreated(res, 'Playlist created', { playlist });
    })(req, res);
  }

  /**
   * Add video to YouTube playlist
   * @param {Object} user - User document
   * @param {string} playlistId - YouTube playlist ID
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} API response
   */
  async addVideoToPlaylist(user, playlistId, videoId) {
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
}

module.exports = YouTubeController;