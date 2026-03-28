const mongoose = require('mongoose');

const videoCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true }, // format: artist__title (lowercased)
  youtubeVideoId: { type: String, required: true },
  title: { type: String },
  artist: { type: String },
  cachedAt: { type: Date, default: Date.now },
});

videoCacheSchema.index({ cacheKey: 1 }, { unique: true });

module.exports = mongoose.model('VideoCache', videoCacheSchema);
