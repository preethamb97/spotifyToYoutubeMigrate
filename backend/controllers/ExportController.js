const BaseController = require('./BaseController');
const MigrationJobRepository = require('../repositories/MigrationJobRepository');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const axios = require('axios');

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Export Controller - handles data export
 */
class ExportController extends BaseController {
  constructor() {
    super('export-controller');
    this.migrationJobRepository = new MigrationJobRepository();
  }

  /**
   * Convert tracks array to CSV string
   * @param {Array} tracks - Array of tracks
   * @param {Array} headers - CSV headers
   * @param {Function} rowMapper - Function to map track to row
   * @returns {string} CSV string
   */
  tracksToCSV(tracks, headers, rowMapper) {
    const rows = [headers.join(',')];
    for (const track of tracks) {
      const values = rowMapper(track).map((val) => {
        const str = String(val || '').replace(/"/g, '""');
        return `"${str}"`;
      });
      rows.push(values.join(','));
    }
    return rows.join('\n');
  }

  /**
   * Export Spotify playlist tracks
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async exportPlaylist(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { spotifyPlaylistId } = req.params;
      const { format } = req.query;

      const SpotifyController = require('./SpotifyController');
      const spotifyController = new SpotifyController();
      const tracks = await spotifyController.getPlaylistTracksDirect(req.user, spotifyPlaylistId);

      this.logger.info({ userId: req.user._id, playlistId: spotifyPlaylistId, format }, 'Exporting playlist');

      if (format === 'csv') {
        const csv = this.tracksToCSV(
          tracks,
          ['Title', 'Artist', 'Album'],
          (t) => [t.title, t.artist, t.albumName]
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="playlist_${spotifyPlaylistId}.csv"`);
        
        this.logger.info({ userId: req.user._id, playlistId: spotifyPlaylistId, count: tracks.length }, 'Exported playlist as CSV');
        return res.send(csv);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="playlist_${spotifyPlaylistId}.json"`);
      
      this.logger.info({ userId: req.user._id, playlistId: spotifyPlaylistId, count: tracks.length }, 'Exported playlist as JSON');
      this.sendSuccess(res, 'Playlist exported', { tracks });
    })(req, res);
  }

  /**
   * Export migration results
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async exportMigration(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { jobId } = req.params;
      const { format } = req.query;

      const job = await this.migrationJobRepository.findOne({
        _id: jobId,
        userId: req.user._id,
      });

      if (!job) {
        throw AppError.notFound('Migration job not found');
      }

      const tracks = job.trackResults;

      if (format === 'csv') {
        const csv = this.tracksToCSV(
          tracks,
          ['Title', 'Artist', 'YouTube Video ID', 'Status'],
          (t) => [t.title, t.artist, t.youtubeVideoId || '', t.status]
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="migration_${jobId}.csv"`);
        
        this.logger.info({ userId: req.user._id, jobId, count: tracks.length }, 'Exported migration as CSV');
        return res.send(csv);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="migration_${jobId}.json"`);
      
      this.logger.info({ userId: req.user._id, jobId, count: tracks.length }, 'Exported migration as JSON');
      this.sendSuccess(res, 'Migration exported', {
        jobId: job._id,
        spotifyPlaylistName: job.spotifyPlaylistName,
        youtubePlaylistName: job.youtubePlaylistName,
        tracks: tracks.map((t) => ({
          title: t.title,
          artist: t.artist,
          youtubeVideoId: t.youtubeVideoId,
          status: t.status,
        })),
      });
    })(req, res);
  }
}

module.exports = ExportController;