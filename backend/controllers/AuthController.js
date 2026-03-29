const BaseController = require('./BaseController');
const UserRepository = require('../repositories/UserRepository');
const { auth: firebaseAuth } = require('../config/firebase');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');

/**
 * Auth Controller - handles authentication endpoints
 */
class AuthController extends BaseController {
  constructor() {
    super('auth-controller');
    this.userRepository = new UserRepository();
    this.FRONTEND_URL = process.env.FRONTEND_URL;
  }

  /**
   * Handle Firebase Google authentication
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async firebaseAuth(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { idToken, accessToken } = req.body;

      this.validateRequired(req.body, ['idToken']);

      const decodedToken = await firebaseAuth.verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      const [user, created] = await this.userRepository.findOrCreateFromGoogle(
        { uid, email, name, picture },
        { accessToken }
      );

      await new Promise((resolve, reject) => {
        req.login(user, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      this.logger.info({ userId: user._id, email, created }, 'User authenticated');

      this.sendSuccess(res, 'Authentication successful', {
        user: {
          id: user._id,
          displayName: user.displayName,
          email: user.email,
          avatar: user.avatar,
          hasGoogle: !!user.googleId,
          hasSpotify: !!user.spotifyId,
        },
      });
    })(req, res);
  }

  /**
   * Initiate Spotify OAuth
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {Function} next - Express next
   */
  spotifyAuth(req, res, next) {
    const passport = require('passport');
    passport.authenticate('spotify', {
      scope: ['playlist-read-private', 'playlist-read-collaborative', 'user-read-private'],
      showDialog: true,
    })(req, res, next);
  }

  /**
   * Handle Spotify OAuth callback
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  spotifyCallback(req, res) {
    const passport = require('passport');
    
    passport.authenticate('spotify', {
      failureRedirect: `${this.FRONTEND_URL}/dashboard`,
    })(req, res, () => {
      res.redirect(`${this.FRONTEND_URL}/dashboard`);
    });
  }

  /**
   * Logout user
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async logout(req, res) {
    return this.asyncHandler(async (req, res) => {
      await new Promise((resolve, reject) => {
        req.logout((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) {
            this.logger.error({ err }, 'Session destroy error');
            reject(err);
          } else {
            resolve();
          }
        });
      });

      res.clearCookie('connect.sid');
      this.sendSuccess(res, 'Logged out successfully');
    })(req, res);
  }

  /**
   * Get current authenticated user
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getCurrentUser(req, res) {
    return this.asyncHandler(async (req, res) => {
      if (!req.user) {
        throw AppError.unauthorized('Not authenticated');
      }

      this.sendSuccess(res, 'User retrieved', {
        id: req.user._id,
        displayName: req.user.displayName,
        email: req.user.email,
        avatar: req.user.avatar,
        hasGoogle: !!req.user.googleId,
        hasSpotify: !!req.user.spotifyId,
      });
    })(req, res);
  }

  /**
   * Check Spotify authentication status
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async spotifyStatus(req, res) {
    return this.asyncHandler(async (req, res) => {
      const passport = require('passport');
      
      // Check if user has valid Spotify token
      if (req.user && req.user.spotifyAccessToken) {
        const axios = require('axios');
        const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
        
        try {
          // Verify token is still valid by making a test request
          await axios.get(`${SPOTIFY_API_BASE}/me`, {
            headers: { Authorization: `Bearer ${req.user.spotifyAccessToken}` },
          });
          
          this.sendSuccess(res, 'Spotify authenticated', {
            authenticated: true,
            hasSpotify: true,
          });
          return;
        } catch (error) {
          // Token is invalid or expired
          this.logger.warn({ userId: req.user._id }, 'Spotify token invalid');
        }
      }
      
      this.sendSuccess(res, 'Spotify not authenticated', {
        authenticated: false,
        hasSpotify: false,
      });
    })(req, res);
  }
}

module.exports = AuthController;
