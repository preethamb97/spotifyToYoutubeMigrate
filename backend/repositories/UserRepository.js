const BaseRepository = require('./BaseRepository');
const User = require('../models/User');

/**
 * User Repository - handles user data access
 */
class UserRepository extends BaseRepository {
  constructor() {
    super(User, 'user-repository');
  }

  /**
   * Find user by Google ID
   * @param {string} googleId - Google user ID
   * @returns {Promise<Document|null>} User document or null
   */
  async findByGoogleId(googleId) {
    return this.findOne({ googleId });
  }

  /**
   * Find user by Spotify ID
   * @param {string} spotifyId - Spotify user ID
   * @returns {Promise<Document|null>} User document or null
   */
  async findBySpotifyId(spotifyId) {
    return this.findOne({ spotifyId });
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Document|null>} User document or null
   */
  async findByEmail(email) {
    return this.findOne({ email });
  }

  /**
   * Update user's Google tokens
   * @param {string} userId - User ID
   * @param {Object} tokens - Token data
   * @returns {Promise<Document|null>} Updated user
   */
  async updateGoogleTokens(userId, tokens) {
    return this.findByIdAndUpdate(userId, {
      googleAccessToken: tokens.accessToken,
      googleRefreshToken: tokens.refreshToken || undefined,
    });
  }

  /**
   * Update user's Spotify tokens
   * @param {string} userId - User ID
   * @param {Object} tokens - Token data
   * @returns {Promise<Document|null>} Updated user
   */
  async updateSpotifyTokens(userId, tokens) {
    return this.findByIdAndUpdate(userId, {
      spotifyAccessToken: tokens.accessToken,
      spotifyRefreshToken: tokens.refreshToken || undefined,
      spotifyTokenExpiry: tokens.expiry,
    });
  }

  /**
   * Find or create user from Google profile
   * @param {Object} googleProfile - Google profile data
   * @param {Object} tokens - Token data
   * @returns {Promise<Array>} User and created flag
   */
  async findOrCreateFromGoogle(googleProfile, tokens) {
    const { uid, email, name, picture } = googleProfile;
    
    let user = await this.findByGoogleId(uid);
    
    if (user) {
      user.googleAccessToken = tokens.accessToken;
      user.email = email || user.email;
      user.displayName = name || user.displayName;
      user.avatar = picture || user.avatar;
      await user.save();
      return [user, false];
    }

    user = await this.create({
      googleId: uid,
      email: email || '',
      displayName: name || '',
      avatar: picture || '',
      googleAccessToken: tokens.accessToken,
    });

    return [user, true];
  }

  /**
   * Find or create user from Spotify profile
   * @param {Object} spotifyProfile - Spotify profile data
   * @param {Object} tokens - Token data
   * @param {Object} existingUser - Existing user to link (optional)
   * @returns {Promise<Array>} User and created flag
   */
  async findOrCreateFromSpotify(spotifyProfile, tokens, existingUser = null) {
    const { id, displayName } = spotifyProfile;
    const spotifyTokenExpiry = Date.now() + tokens.expiresIn * 1000;

    if (existingUser) {
      existingUser.spotifyId = id;
      existingUser.spotifyAccessToken = tokens.accessToken;
      existingUser.spotifyRefreshToken = tokens.refreshToken || existingUser.spotifyRefreshToken;
      existingUser.spotifyTokenExpiry = spotifyTokenExpiry;
      existingUser.displayName = existingUser.displayName || displayName;
      await existingUser.save();
      return [existingUser, false];
    }

    let user = await this.findBySpotifyId(id);
    if (user) {
      user.spotifyAccessToken = tokens.accessToken;
      user.spotifyRefreshToken = tokens.refreshToken || user.spotifyRefreshToken;
      user.spotifyTokenExpiry = spotifyTokenExpiry;
      await user.save();
      return [user, false];
    }

    user = await this.create({
      spotifyId: id,
      displayName: displayName,
      spotifyAccessToken: tokens.accessToken,
      spotifyRefreshToken: tokens.refreshToken,
      spotifyTokenExpiry: spotifyTokenExpiry,
    });

    return [user, true];
  }
}

module.exports = UserRepository;