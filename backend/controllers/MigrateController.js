const BaseController = require('./BaseController');
const MigrationJobRepository = require('../repositories/MigrationJobRepository');
const UserRepository = require('../repositories/UserRepository');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');

/**
 * Migrate Controller - handles playlist migration
 */
class MigrateController extends BaseController {
  constructor() {
    super('migrate-controller');
    this.migrationJobRepository = new MigrationJobRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Start a migration job
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async startMigration(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { spotifyPlaylistId, spotifyPlaylistName, youtubePlaylistId, newYoutubePlaylistName } = req.body;

      this.validateRequired(req.body, ['spotifyPlaylistId']);

      if (!req.user.spotifyId || !req.user.spotifyAccessToken) {
        throw AppError.forbidden('Spotify account not connected');
      }

      // Get Spotify tracks
      const SpotifyController = require('./SpotifyController');
      const spotifyController = new SpotifyController();
      const tracks = await spotifyController.getPlaylistTracksDirect(req.user, spotifyPlaylistId);

      if (!tracks || tracks.length === 0) {
        throw AppError.badRequest('Playlist has no tracks to migrate');
      }

      // Determine YouTube playlist
      let ytPlaylistId = youtubePlaylistId;
      let ytPlaylistName = '';

      if (!ytPlaylistId) {
        const YouTubeController = require('./YouTubeController');
        const youtubeController = new YouTubeController();
        const playlistTitle = newYoutubePlaylistName || spotifyPlaylistName || 'Migrated Playlist';
        const newPlaylist = await youtubeController.createPlaylistDirect(req.user, playlistTitle);
        ytPlaylistId = newPlaylist.id;
        ytPlaylistName = newPlaylist.title;
      } else {
        ytPlaylistName = newYoutubePlaylistName || 'Existing Playlist';
      }

      // Create migration job
      const job = await this.migrationJobRepository.createFromTracks({
        userId: req.user._id,
        spotifyPlaylistId,
        spotifyPlaylistName: spotifyPlaylistName || '',
        youtubePlaylistId: ytPlaylistId,
        youtubePlaylistName: ytPlaylistName,
      }, tracks);

      // Start migration in background
      this.runMigration(job._id, req.user._id).catch((err) => {
        this.logger.error({ err, jobId: job._id }, 'Migration background error');
      });

      this.logger.info({ jobId: job._id, userId: req.user._id, totalTracks: tracks.length }, 'Migration started');

      this.sendCreated(res, 'Migration started', {
        jobId: job._id,
        status: job.status,
        totalTracks: job.totalTracks,
        youtubePlaylistId: ytPlaylistId,
        youtubePlaylistName: ytPlaylistName,
      });
    })(req, res);
  }

  /**
   * Run migration in background
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID
   */
  async runMigration(jobId, userId) {
    const job = await this.migrationJobRepository.findById(jobId);
    const user = await this.userRepository.findById(userId);

    if (!job || !user) {
      this.logger.error({ jobId, userId }, 'Job or user not found');
      return;
    }

    await this.migrationJobRepository.updateStatus(jobId, 'running');
    this.logger.info({ jobId, totalTracks: job.totalTracks }, 'Migration started');

    const YouTubeController = require('./YouTubeController');
    const SearchService = require('../services/SearchService');
    const youtubeController = new YouTubeController();
    const searchService = new SearchService();

    for (let i = 0; i < job.trackResults.length; i++) {
      const track = job.trackResults[i];

      try {
        const youtubeVideoId = await searchService.findVideo(track.artist, track.title);

        if (youtubeVideoId) {
          try {
            await youtubeController.addVideoToPlaylist(user, job.youtubePlaylistId, youtubeVideoId);
            await this.migrationJobRepository.updateTrackResult(jobId, i, {
              youtubeVideoId,
              status: 'success',
            });
          } catch (ytError) {
            this.logger.error({ jobId, track: track.title, err: ytError }, 'Failed to add video to playlist');
            await this.migrationJobRepository.updateTrackResult(jobId, i, {
              youtubeVideoId,
              status: ytError.response?.status === 403 ? 'failed' : 'failed',
            });
          }
        } else {
          await this.migrationJobRepository.updateTrackResult(jobId, i, { status: 'not_found' });
        }
      } catch (error) {
        this.logger.error({ jobId, track: track.title, err: error }, 'Error processing track');
        await this.migrationJobRepository.updateTrackResult(jobId, i, { status: 'error' });
      }

      await this.migrationJobRepository.incrementProgress(jobId, track.status !== 'success' ? 1 : 0);

      // Respect rate limits
      if (i < job.trackResults.length - 1) {
        await this.delay(500);
      }
    }

    await this.migrationJobRepository.updateStatus(jobId, 'done');
    this.logger.info({
      jobId,
      processed: job.processedTracks + 1,
      failed: job.failedTracks,
      total: job.totalTracks,
    }, 'Migration completed');
  }

  /**
   * Get migration job status
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getStatus(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { jobId } = req.params;

      const job = await this.migrationJobRepository.findOne({
        _id: jobId,
        userId: req.user._id,
      });

      if (!job) {
        throw AppError.notFound('Migration job not found');
      }

      this.sendSuccess(res, 'Job status retrieved', {
        jobId: job._id,
        status: job.status,
        spotifyPlaylistName: job.spotifyPlaylistName,
        youtubePlaylistId: job.youtubePlaylistId,
        youtubePlaylistName: job.youtubePlaylistName,
        totalTracks: job.totalTracks,
        processedTracks: job.processedTracks,
        failedTracks: job.failedTracks,
        trackResults: job.trackResults,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    })(req, res);
  }

  /**
   * Get user's migration history
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getHistory(req, res) {
    return this.asyncHandler(async (req, res) => {
      const jobs = await this.migrationJobRepository.findRecentByUserId(req.user._id, 20);

      this.sendSuccess(res, 'Migration history retrieved', { jobs });
    })(req, res);
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = MigrateController;