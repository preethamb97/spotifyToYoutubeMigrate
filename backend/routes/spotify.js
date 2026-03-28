const express = require('express');
const { requireSpotify } = require('../middleware/auth');
const SpotifyController = require('../controllers/SpotifyController');

const router = express.Router();
const spotifyController = new SpotifyController();

/**
 * @swagger
 * tags:
 *   name: Spotify
 *   description: Spotify integration endpoints
 */

/**
 * @swagger
 * /api/spotify/playlists:
 *   get:
 *     summary: Get user's Spotify playlists
 *     tags: [Spotify]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Playlists retrieved
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
 *                         playlists:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Playlist'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/playlists', requireSpotify, spotifyController.getPlaylists.bind(spotifyController));

/**
 * @swagger
 * /api/spotify/playlist/{playlistId}/tracks:
 *   get:
 *     summary: Get tracks from a Spotify playlist
 *     tags: [Spotify]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Spotify playlist ID
 *     responses:
 *       200:
 *         description: Tracks retrieved
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
 *                         tracks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Track'
 *                         total:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/playlist/:id/tracks', requireSpotify, spotifyController.getPlaylistTracks.bind(spotifyController));

module.exports = router;