const express = require('express');
const AuthController = require('../controllers/AuthController');

const router = express.Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/firebase:
 *   post:
 *     summary: Authenticate with Firebase (Google)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Firebase ID token from Google sign-in
 *               accessToken:
 *                 type: string
 *                 description: Google OAuth access token for YouTube
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid Firebase token
 */
router.post('/firebase', authController.firebaseAuth.bind(authController));

/**
 * @swagger
 * /auth/spotify:
 *   get:
 *     summary: Initiate Spotify OAuth
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Spotify authorization
 */
router.get('/spotify', authController.spotifyAuth.bind(authController));

/**
 * @swagger
 * /auth/spotify/callback:
 *   get:
 *     summary: Spotify OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to frontend dashboard
 */
router.get('/spotify/callback', authController.spotifyCallback.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/logout', authController.logout.bind(authController));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: User retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', authController.getCurrentUser.bind(authController));

/**
 * @swagger
 * /auth/spotify/status:
 *   get:
 *     summary: Check Spotify authentication status
 *     tags: [Auth]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Spotify authentication status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         authenticated:
 *                           type: boolean
 *                         hasSpotify:
 *                           type: boolean
 */
router.get('/spotify/status', authController.spotifyStatus.bind(authController));

/**
 * @swagger
 * /auth/spotify/exchange:
 *   post:
 *     summary: Exchange Spotify authorization code for tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Spotify authorization code
 *     responses:
 *       200:
 *         description: Spotify connected successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         hasSpotify:
 *                           type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/spotify/exchange', authController.spotifyExchange.bind(authController));

/**
 * @swagger
 * /auth/spotify/save-tokens:
 *   post:
 *     summary: Save Spotify tokens from frontend
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *               - spotifyId
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Spotify access token
 *               refreshToken:
 *                 type: string
 *                 description: Spotify refresh token
 *               expiresIn:
 *                 type: number
 *                 description: Token expiry in seconds
 *               spotifyId:
 *                 type: string
 *                 description: Spotify user ID
 *               displayName:
 *                 type: string
 *                 description: User display name
 *     responses:
 *       200:
 *         description: Spotify tokens saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         hasSpotify:
 *                           type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/spotify/save-tokens', authController.spotifySaveTokens.bind(authController));

module.exports = router;
