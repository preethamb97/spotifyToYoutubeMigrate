const mongoose = require('mongoose');

const trackResultSchema = new mongoose.Schema({
  spotifyTrackId: { type: String },
  title: { type: String },
  artist: { type: String },
  youtubeVideoId: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'success', 'not_found', 'failed'],
    default: 'pending',
  },
}, { _id: false });

const migrationJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  spotifyPlaylistId: { type: String, required: true },
  spotifyPlaylistName: { type: String, default: '' },
  youtubePlaylistId: { type: String },
  youtubePlaylistName: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'running', 'done', 'failed'],
    default: 'pending',
  },
  totalTracks: { type: Number, default: 0 },
  processedTracks: { type: Number, default: 0 },
  failedTracks: { type: Number, default: 0 },
  trackResults: [trackResultSchema],
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

migrationJobSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

migrationJobSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MigrationJob', migrationJobSchema);
