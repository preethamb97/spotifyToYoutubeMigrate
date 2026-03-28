const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, sparse: true },
  spotifyId: { type: String, sparse: true },
  displayName: { type: String, default: '' },
  email: { type: String, default: '' },
  avatar: { type: String, default: '' },
  googleAccessToken: { type: String },
  googleRefreshToken: { type: String },
  spotifyAccessToken: { type: String },
  spotifyRefreshToken: { type: String },
  spotifyTokenExpiry: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

// Index for quick lookups
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ spotifyId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
