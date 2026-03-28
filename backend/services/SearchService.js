const BaseService = require('./BaseService');
const VideoCacheRepository = require('../repositories/VideoCacheRepository');
const ytsr = require('ytsr');
const fetch = require('node-fetch');

const INVIDIOUS_INSTANCES = [
  'https://invidious.fdn.fr',
  'https://inv.nadeko.net',
  'https://invidious.privacyredirect.com',
];

/**
 * Search Service - handles YouTube video search
 */
class SearchService extends BaseService {
  constructor() {
    super('search-service');
    this.videoCacheRepository = new VideoCacheRepository();
  }

  /**
   * Find a YouTube video for a given artist + title
   * @param {string} artist - Artist name
   * @param {string} title - Track title
   * @returns {Promise<string|null>} YouTube video ID or null
   */
  async findVideo(artist, title) {
    return this.execute('findVideo', async () => {
      // 1. Check cache
      const cached = await this.videoCacheRepository.findByArtistAndTitle(artist, title);
      if (cached) {
        this.logger.debug({ artist, title, videoId: cached.youtubeVideoId }, 'Cache hit');
        return cached.youtubeVideoId;
      }

      // Build search query
      const query = `${artist} ${title} official`;

      // 2. Try ytsr
      let result = await this.searchWithYtsr(query);

      // 3. Fallback to Invidious
      if (!result) {
        this.logger.info({ query }, 'ytsr failed, trying Invidious');
        result = await this.searchWithInvidious(`${artist} ${title}`);
      }

      // 4. Cache and return
      if (result) {
        await this.videoCacheRepository.upsertCache(artist, title, result.videoId);
        this.logger.debug({ artist, title, videoId: result.videoId }, 'Cached video');
        return result.videoId;
      }

      this.logger.warn({ artist, title }, 'No video found');
      return null;
    }, { artist, title });
  }

  /**
   * Search YouTube using ytsr (no API key needed)
   * @param {string} query - Search query
   * @returns {Promise<Object|null>} Video result or null
   */
  async searchWithYtsr(query) {
    try {
      const results = await ytsr(query, { limit: 5 });
      const video = results.items.find((item) => item.type === 'video');
      if (video) {
        return {
          videoId: video.id,
          title: video.title,
        };
      }
      return null;
    } catch (error) {
      this.logger.error({ err: error, query }, 'ytsr search failed');
      return null;
    }
  }

  /**
   * Search YouTube using Invidious API (fallback)
   * @param {string} query - Search query
   * @returns {Promise<Object|null>} Video result or null
   */
  async searchWithInvidious(query) {
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
        const response = await fetch(url, { timeout: 8000 });

        if (!response.ok) continue;

        const data = await response.json();
        if (data && data.length > 0) {
          return {
            videoId: data[0].videoId,
            title: data[0].title,
          };
        }
      } catch (error) {
        this.logger.warn({ err: error, instance }, 'Invidious instance failed');
        continue;
      }
    }
    return null;
  }
}

module.exports = SearchService;