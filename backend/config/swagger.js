const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PlaylistBridge API',
      version: '1.0.0',
      description: 'API for migrating Spotify playlists to YouTube',
      contact: {
        name: 'PlaylistBridge Support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        SessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            meta: {
              type: 'object',
              description: 'Additional metadata (pagination, etc.)',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Detailed error messages',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
            displayName: {
              type: 'string',
              description: 'User display name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'User avatar URL',
            },
            hasGoogle: {
              type: 'boolean',
              description: 'Whether Google account is connected',
            },
            hasSpotify: {
              type: 'boolean',
              description: 'Whether Spotify account is connected',
            },
          },
        },
        Playlist: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Playlist ID',
            },
            name: {
              type: 'string',
              description: 'Playlist name',
            },
            trackCount: {
              type: 'integer',
              description: 'Number of tracks in playlist',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'Playlist cover image URL',
            },
            owner: {
              type: 'string',
              description: 'Playlist owner name',
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether playlist is public',
            },
          },
        },
        Track: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Track ID',
            },
            title: {
              type: 'string',
              description: 'Track title',
            },
            artist: {
              type: 'string',
              description: 'Track artist(s)',
            },
            albumName: {
              type: 'string',
              description: 'Album name',
            },
          },
        },
        MigrationJob: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'Migration job ID',
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'done', 'failed'],
              description: 'Job status',
            },
            spotifyPlaylistName: {
              type: 'string',
              description: 'Source Spotify playlist name',
            },
            youtubePlaylistId: {
              type: 'string',
              description: 'Target YouTube playlist ID',
            },
            youtubePlaylistName: {
              type: 'string',
              description: 'Target YouTube playlist name',
            },
            totalTracks: {
              type: 'integer',
              description: 'Total tracks to migrate',
            },
            processedTracks: {
              type: 'integer',
              description: 'Tracks processed so far',
            },
            failedTracks: {
              type: 'integer',
              description: 'Tracks that failed to migrate',
            },
            trackResults: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TrackResult',
              },
            },
            errorMessage: {
              type: 'string',
              description: 'Error message if job failed',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        TrackResult: {
          type: 'object',
          properties: {
            spotifyTrackId: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            artist: {
              type: 'string',
            },
            youtubeVideoId: {
              type: 'string',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['pending', 'success', 'not_found', 'error'],
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages',
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Not authenticated',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'Not authenticated',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
        Forbidden: {
          description: 'Not authorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'You do not have permission to access this resource',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'Resource not found',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'Validation Error',
                errors: ['Field is required'],
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                message: 'Internal Server Error',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Spotify',
        description: 'Spotify integration endpoints',
      },
      {
        name: 'YouTube',
        description: 'YouTube integration endpoints',
      },
      {
        name: 'Migration',
        description: 'Playlist migration endpoints',
      },
      {
        name: 'Export',
        description: 'Data export endpoints',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;