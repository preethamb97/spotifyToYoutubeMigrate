const ytsr = require('ytsr');
const fetch = require('node-fetch');
const VideoCache = require('../models/VideoCache');
const { createModuleLogger } = require('../config/logger');

const log = createModuleLogger('search-service');

// Invidious fallback instances (tried in order)
const INVIDIOUS_INSTANCES = [
  'https://invidious.fdn.fr',
  'https://inv.nadeko.net',
  'https://invidious.privacyredirect.com',
];

/**
 * Generate a cache key from artist and title
 */
function makeCacheKey(artist, title) {
  return `${artist}__${title}`.toLowerCase().trim();
}

/**
 * Search YouTube using ytsr (no API key needed)
 */
async function searchWithYtsr(query) {
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
    log.error({ err: error, query }, 'ytsr search failed');
    return null;
  }
}

/**
 * Search YouTube using Invidious API (fallback, no API key needed)
 */
async function searchWithInvidious(query) {
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
      log.warn({ err: error, instance }, 'Invidious instance failed');
      continue;
    }
  }
  return null;
}

/**
 * Find a YouTube video for a given artist + title.
 * 1. Check MongoDB VideoCache
 * 2. Try ytsr
 * 3. Fallback to Invidious
 * 4. Cache the result
 */
async function findVideo(artist, title) {
  const cacheKey = makeCacheKey(artist, title);

  // 1. Check cache
  try {
    const cached = await VideoCache.findOne({ cacheKey });
    if (cached) {
      log.debug({ cacheKey, videoId: cached.youtubeVideoId }, 'Cache hit');
      return cached.youtubeVideoId;
    }
  } catch (error) {
    log.error({ err: error, cacheKey }, 'Cache lookup error');
  }

  // Build search query
  const query = `${artist} ${title} official`;

  // 2. Try ytsr
  let result = await searchWithYtsr(query);

  // 3. Fallback to Invidious
  if (!result) {
    log.info({ query }, 'ytsr failed, trying Invidious');
    result = await searchWithInvidious(`${artist} ${title}`);
  }

  // 4. Cache and return
  if (result) {
    try {
      await VideoCache.findOneAndUpdate(
        { cacheKey },
        {
          cacheKey,
          youtubeVideoId: result.videoId,
          title,
          artist,
          cachedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      log.debug({ cacheKey, videoId: result.videoId }, 'Cached video');
    } catch (error) {
      log.error({ err: error, cacheKey }, 'Cache save error');
    }
    return result.videoId;
  }

  log.warn({ artist, title }, 'No video found');
  return null;
}

module.exports = {
  findVideo,
  makeCacheKey,
};
