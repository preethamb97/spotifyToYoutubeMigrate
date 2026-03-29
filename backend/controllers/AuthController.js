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

  /**
   * Exchange Spotify authorization code for tokens
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async spotifyExchange(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { code } = req.body;
      
      if (!code) {
        throw AppError.badRequest('Authorization code is required');
      }

      const axios = require('axios');
      const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
      
      try {
        // Exchange code for access token
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', process.env.SPOTIFY_CALLBACK_URL);
        
        const basicAuth = Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64');

        const response = await axios.post(SPOTIFY_TOKEN_URL, params, {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const { access_token, refresh_token, expires_in } = response.data;
        const spotifyTokenExpiry = Date.now() + expires_in * 1000;

        // Get user profile from Spotify
        const spotifyProfile = await axios.get('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        const { id: spotifyId, display_name } = spotifyProfile.data;

        // Update or create user
        if (req.user) {
          // User is already logged in, attach Spotify
          const user = await this.userRepository.findById(req.user._id);
          if (user) {
            user.spotifyId = spotifyId;
            user.spotifyAccessToken = access_token;
            user.spotifyRefreshToken = refresh_token;
            user.spotifyTokenExpiry = spotifyTokenExpiry;
            user.displayName = user.displayName || display_name;
            await user.save();
            
            this.logger.info({ userId: user._id, spotifyId }, 'Spotify connected to existing user');
          }
        } else {
          // No user logged in, create new user or find by spotifyId
          let user = await this.userRepository.findOne({ spotifyId });
          
          if (user) {
            // Update existing user
            user.spotifyAccessToken = access_token;
            user.spotifyRefreshToken = refresh_token;
            user.spotifyTokenExpiry = spotifyTokenExpiry;
            await user.save();
          } else {
            // Create new user
            user = await this.userRepository.create({
              spotifyId,
              displayName: display_name,
              spotifyAccessToken: access_token,
              spotifyRefreshToken: refresh_token,
              spotifyTokenExpiry: spotifyTokenExpiry,
            });
          }
          
          // Log in the user
          await new Promise((resolve, reject) => {
            req.login(user, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          this.logger.info({ userId: user._id, spotifyId }, 'New user created from Spotify');
        }

        this.sendSuccess(res, 'Spotify connected successfully', {
          success: true,
          hasSpotify: true,
        });
      } catch (error) {
        this.logger.error({ err: error }, 'Failed to exchange Spotify code');
        throw AppError.internal('Failed to connect Spotify. Please try again.');
      }
    })(req, res);
  }

  /**
   * Save Spotify tokens from frontend
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async spotifySaveTokens(req, res) {
    return this.asyncHandler(async (req, res) => {
      const { accessToken, refreshToken, expiresIn, spotifyId, displayName } = req.body;
      
      if (!accessToken || !spotifyId) {
        throw AppError.badRequest('Access token and Spotify ID are required');
      }

      try {
        const spotifyTokenExpiry = Date.now() + expiresIn * 1000;

        // Update or create user
        if (req.user) {
          // User is already logged in, attach Spotify
          const user = await this.userRepository.findById(req.user._id);
          if (user) {
            user.spotifyId = spotifyId;
            user.spotifyAccessToken = accessToken;
            user.spotifyRefreshToken = refreshToken;
            user.spotifyTokenExpiry = spotifyTokenExpiry;
            user.displayName = user.displayName || displayName;
            await user.save();
            
            this.logger.info({ userId: user._id, spotifyId }, 'Spotify tokens saved to existing user');
          }
        } else {
          // No user logged in, create new user or find by spotifyId
          let user = await this.userRepository.findOne({ spotifyId });
          
          if (user) {
            // Update existing user
            user.spotifyAccessToken = accessToken;
            user.spotifyRefreshToken = refreshToken;
            user.spotifyTokenExpiry = spotifyTokenExpiry;
            await user.save();
          } else {
            // Create new user
            user = await this.userRepository.create({
              spotifyId,
              displayName: displayName,
              spotifyAccessToken: accessToken,
              spotifyRefreshToken: refreshToken,
              spotifyTokenExpiry: spotifyTokenExpiry,
            });
          }
          
          // Log in the user
          await new Promise((resolve, reject) => {
            req.login(user, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          this.logger.info({ userId: user._id, spotifyId }, 'New user created from Spotify tokens');
        }

        this.sendSuccess(res, 'Spotify tokens saved successfully', {
          success: true,
          hasSpotify: true,
        });
      } catch (error) {
        this.logger.error({ err: error }, 'Failed to save Spotify tokens');
        throw AppError.internal('Failed to save Spotify connection. Please try again.');
      }
    })(req, res);
  }
}

module.exports = AuthController;
