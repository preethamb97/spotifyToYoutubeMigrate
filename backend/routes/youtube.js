const express = require('express');
const { requireGoogle } = require('../middleware/auth');
const YouTubeController = require('../controllers/YouTubeController');

const router = express.Router();
const youtubeController = new YouTubeController();

/**
 * @swagger
 * tags:
 *   name: YouTube
 *   description: YouTube integration endpoints
 */

/**
 * @swagger
 * /api/youtube/playlists:
 *   get:
 *     summary: Get user's YouTube playlists
 *     tags: [YouTube]
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
router.get('/playlists', requireGoogle, youtubeController.getPlaylists.bind(youtubeController));

/**
 * @swagger
 * /api/youtube/playlist:
 *   post:
 *     summary: Create a new YouTube playlist
 *     tags: [YouTube]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Playlist title
 *               description:
 *                 type: string
 *                 description: Playlist description
 *     responses:
 *       201:
 *         description: Playlist created
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
 *                         playlist:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             title:
 *                               type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/playlist', requireGoogle, youtubeController.createPlaylist.bind(youtubeController));

module.exports = router;