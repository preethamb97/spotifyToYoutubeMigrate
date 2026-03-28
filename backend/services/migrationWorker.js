const MigrationJob = require('../models/MigrationJob');
const User = require('../models/User');
const searchService = require('./searchService');
const youtubeService = require('./youtubeService');
const { createModuleLogger } = require('../config/logger');

const log = createModuleLogger('migration-worker');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run migration job in the background.
 * This function is called without await (fire and forget).
 */
async function runMigration(jobId, userId) {
  let job;
  try {
    job = await MigrationJob.findById(jobId);
    const user = await User.findById(userId);

    if (!job || !user) {
      log.error({ jobId, userId }, 'Job or user not found');
      return;
    }

    job.status = 'running';
    await job.save();

    log.info({ jobId, totalTracks: job.totalTracks }, 'Migration started');

    for (let i = 0; i < job.trackResults.length; i++) {
      const track = job.trackResults[i];

      try {
        // 1. Search for YouTube video
        const youtubeVideoId = await searchService.findVideo(track.artist, track.title);

        if (youtubeVideoId) {
          // 2. Add video to YouTube playlist
          try {
            await youtubeService.addVideoToPlaylist(user, job.youtubePlaylistId, youtubeVideoId);
            job.trackResults[i].youtubeVideoId = youtubeVideoId;
            job.trackResults[i].status = 'success';
          } catch (ytError) {
            log.error({ jobId, track: track.title, err: ytError }, 'Failed to add video to playlist');
            // If it's a quota exceeded error, pause but don't fail
            if (ytError.response?.status === 403) {
              job.trackResults[i].status = 'failed';
              job.failedTracks++;
              // Still save the videoId for reference
              job.trackResults[i].youtubeVideoId = youtubeVideoId;
            } else {
              job.trackResults[i].status = 'failed';
              job.failedTracks++;
            }
          }
        } else {
          // Not found via search
          job.trackResults[i].status = 'not_found';
          job.failedTracks++;
        }
      } catch (error) {
        log.error({ jobId, track: track.title, err: error }, 'Error processing track');
        job.trackResults[i].status = 'failed';
        job.failedTracks++;
      }

      // Update progress
      job.processedTracks = i + 1;
      await job.save();

      // 500ms delay between YouTube inserts to respect quota
      if (i < job.trackResults.length - 1) {
        await sleep(500);
      }
    }

    job.status = 'done';
    await job.save();
    log.info({
      jobId,
      processed: job.processedTracks,
      failed: job.failedTracks,
      total: job.totalTracks,
      successful: job.processedTracks - job.failedTracks
    }, 'Migration completed');
  } catch (error) {
    log.error({ jobId, err: error }, 'Migration fatal error');
    if (job) {
      job.status = 'failed';
      job.errorMessage = error.message;
      await job.save().catch(() => {});
    }
  }
}

module.exports = { runMigration };
