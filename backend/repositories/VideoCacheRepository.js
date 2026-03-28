const BaseRepository = require('./BaseRepository');
const VideoCache = require('../models/VideoCache');

/**
 * Video Cache Repository - handles video cache data access
 */
class VideoCacheRepository extends BaseRepository {
  constructor() {
    super(VideoCache, 'video-cache-repository');
  }

  /**
   * Find cached video by cache key
   * @param {string} cacheKey - Cache key (artist__title)
   * @returns {Promise<Document|null>} Cached video or null
   */
  async findByCacheKey(cacheKey) {
    return this.findOne({ cacheKey });
  }

  /**
   * Find cached video by artist and title
   * @param {string} artist - Artist name
   * @param {string} title - Track title
   * @returns {Promise<Document|null>} Cached video or null
   */
  async findByArtistAndTitle(artist, title) {
    const cacheKey = this.createCacheKey(artist, title);
    return this.findByCacheKey(cacheKey);
  }

  /**
   * Create cache key from artist and title
   * @param {string} artist - Artist name
   * @param {string} title - Track title
   * @returns {string} Cache key
   */
  createCacheKey(artist, title) {
    return `${artist}__${title}`.toLowerCase().trim();
  }

  /**
   * Upsert video cache entry
   * @param {string} artist - Artist name
   * @param {string} title - Track title
   * @param {string} youtubeVideoId - YouTube video ID
   * @returns {Promise<Document>} Updated or created cache entry
   */
  async upsertCache(artist, title, youtubeVideoId) {
    const cacheKey = this.createCacheKey(artist, title);
    
    return this.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        youtubeVideoId,
        title,
        artist,
        cachedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    const [totalEntries, recentEntries] = await Promise.all([
      this.count(),
      this.count({ cachedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    return {
      totalEntries,
      recentEntries,
    };
  }

  /**
   * Clear old cache entries
   * @param {number} daysOld - Number of days old to clear
   * @returns {Promise<Object>} Delete result
   */
  async clearOldEntries(daysOld = 90) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    return this.deleteMany({ cachedAt: { $lt: cutoffDate } });
  }

  /**
   * Delete many documents by filter
   * @param {Object} filter - Query filter
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(filter) {
    try {
      const result = await this.model.deleteMany(filter);
      this.logger.debug({ filter, deletedCount: result.deletedCount }, 'Documents deleted');
      return result;
    } catch (error) {
      this.logger.error({ err: error, filter }, 'Failed to delete documents');
      throw error;
    }
  }
}

module.exports = VideoCacheRepository;