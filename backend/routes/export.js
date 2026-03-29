const express = require('express');
const { requireSpotify } = require('../middleware/auth');
const ExportController = require('../controllers/ExportController');

const router = express.Router();
const exportController = new ExportController();

/**
 * @swagger
 * tags:
 *   name: Export
 *   description: Data export endpoints
 */

/**
 * @swagger
 * /api/export/{spotifyPlaylistId}:
 *   get:
 *     summary: Export Spotify playlist tracks
 *     tags: [Export]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: spotifyPlaylistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Spotify playlist ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, csv-full]
 *           default: csv
 *         description: "Export format: csv (basic), csv-full (comprehensive), json (complete)"
 *     responses:
 *       200:
 *         description: Playlist exported
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
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/:spotifyPlaylistId', requireSpotify, exportController.exportPlaylist.bind(exportController));

/**
 * @swagger
 * /api/export/migration/{jobId}:
 *   get:
 *     summary: Export migration results
 *     tags: [Export]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Migration job ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Migration exported
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
 *                         jobId:
 *                           type: string
 *                         spotifyPlaylistName:
 *                           type: string
 *                         youtubePlaylistName:
 *                           type: string
 *                         tracks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TrackResult'
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/migration/:jobId', exportController.exportMigration.bind(exportController));

module.exports = router;