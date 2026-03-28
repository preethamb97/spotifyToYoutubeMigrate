const BaseRepository = require('./BaseRepository');
const MigrationJob = require('../models/MigrationJob');

/**
 * Migration Job Repository - handles migration job data access
 */
class MigrationJobRepository extends BaseRepository {
  constructor() {
    super(MigrationJob, 'migration-job-repository');
  }

  /**
   * Find jobs by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Migration jobs
   */
  async findByUserId(userId, options = {}) {
    return this.find({ userId }, {
      sort: { createdAt: -1 },
      ...options,
    });
  }

  /**
   * Find recent jobs by user ID
   * @param {string} userId - User ID
   * @param {number} limit - Number of jobs to return
   * @returns {Promise<Array>} Recent migration jobs
   */
  async findRecentByUserId(userId, limit = 20) {
    return this.find({ userId }, {
      sort: { createdAt: -1 },
      limit,
      select: 'spotifyPlaylistName youtubePlaylistName status totalTracks processedTracks failedTracks createdAt',
    });
  }

  /**
   * Update job status
   * @param {string} jobId - Job ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Document|null>} Updated job
   */
  async updateStatus(jobId, status, additionalData = {}) {
    return this.findByIdAndUpdate(jobId, { status, ...additionalData });
  }

  /**
   * Update track result in job
   * @param {string} jobId - Job ID
   * @param {number} trackIndex - Track index in array
   * @param {Object} trackData - Track data to update
   * @returns {Promise<Document|null>} Updated job
   */
  async updateTrackResult(jobId, trackIndex, trackData) {
    const updateQuery = {};
    Object.keys(trackData).forEach((key) => {
      updateQuery[`trackResults.${trackIndex}.${key}`] = trackData[key];
    });
    
    return this.findByIdAndUpdate(jobId, { $set: updateQuery });
  }

  /**
   * Increment processed tracks count
   * @param {string} jobId - Job ID
   * @param {number} failedCount - Number of failed tracks to add
   * @returns {Promise<Document|null>} Updated job
   */
  async incrementProgress(jobId, failedCount = 0) {
    const update = { $inc: { processedTracks: 1 } };
    if (failedCount > 0) {
      update.$inc.failedTracks = failedCount;
    }
    return this.findByIdAndUpdate(jobId, update);
  }

  /**
   * Create migration job from tracks
   * @param {Object} jobData - Job data
   * @param {Array} tracks - Array of tracks
   * @returns {Promise<Document>} Created job
   */
  async createFromTracks(jobData, tracks) {
    return this.create({
      ...jobData,
      status: 'pending',
      totalTracks: tracks.length,
      processedTracks: 0,
      failedTracks: 0,
      trackResults: tracks.map((t) => ({
        spotifyTrackId: t.id,
        title: t.title,
        artist: t.artist,
        youtubeVideoId: null,
        status: 'pending',
      })),
    });
  }
}

module.exports = MigrationJobRepository;