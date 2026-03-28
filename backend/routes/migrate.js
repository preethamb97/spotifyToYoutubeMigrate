const express = require('express');
const { requireGoogle } = require('../middleware/auth');
const MigrateController = require('../controllers/MigrateController');

const router = express.Router();
const migrateController = new MigrateController();

/**
 * @swagger
 * tags:
 *   name: Migration
 *   description: Playlist migration endpoints
 */

/**
 * @swagger
 * /api/migrate:
 *   post:
 *     summary: Start a migration job
 *     tags: [Migration]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spotifyPlaylistId
 *             properties:
 *               spotifyPlaylistId:
 *                 type: string
 *                 description: Spotify playlist ID to migrate
 *               spotifyPlaylistName:
 *                 type: string
 *                 description: Spotify playlist name
 *               youtubePlaylistId:
 *                 type: string
 *                 description: Existing YouTube playlist ID (optional)
 *               newYoutubePlaylistName:
 *                 type: string
 *                 description: New YouTube playlist name (if creating new)
 *     responses:
 *       201:
 *         description: Migration started
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MigrationJob'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requireGoogle, migrateController.startMigration.bind(migrateController));

/**
 * @swagger
 * /api/migrate/{jobId}/status:
 *   get:
 *     summary: Get migration job status
 *     tags: [Migration]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Migration job ID
 *     responses:
 *       200:
 *         description: Job status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MigrationJob'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:jobId/status', migrateController.getStatus.bind(migrateController));

/**
 * @swagger
 * /api/migrate/history/list:
 *   get:
 *     summary: Get user's migration history
 *     tags: [Migration]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Migration history retrieved
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
 *                         jobs:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MigrationJob'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/history/list', migrateController.getHistory.bind(migrateController));

module.exports = router;