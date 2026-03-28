const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const { createModuleLogger } = require('../config/logger');

/**
 * Base Controller class with common functionality
 * Implements Template Method pattern for consistent request handling
 */
class BaseController {
  constructor(moduleName) {
    this.logger = createModuleLogger(moduleName);
  }

  /**
   * Execute an async handler with error handling
   * @param {Function} handler - Async handler function
   * @returns {Function} Express middleware function
   */
  asyncHandler(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        this.handleError(error, req, res);
      }
    };
  }

  /**
   * Handle errors consistently
   * @param {Error} error - Error object
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  handleError(error, req, res) {
    this.logger.error({ err: error, path: req.path, method: req.method }, 'Request error');

    if (error instanceof AppError) {
      return res.status(error.statusCode).json(
        ApiResponse.error(error.message, error.errors)
      );
    }

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(422).json(ApiResponse.validation('Validation Error', errors));
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json(ApiResponse.error(`${field} already exists`));
    }

    // Default to 500 Internal Server Error
    res.status(500).json(ApiResponse.error('Internal Server Error'));
  }

  /**
   * Send success response
   * @param {Response} res - Express response
   * @param {string} message - Success message
   * @param {*} data - Response data
   * @param {number} statusCode - HTTP status code
   */
  sendSuccess(res, message, data = null, statusCode = 200) {
    res.status(statusCode).json(ApiResponse.success(message, data));
  }

  /**
   * Send created response
   * @param {Response} res - Express response
   * @param {string} message - Success message
   * @param {*} data - Response data
   */
  sendCreated(res, message, data = null) {
    this.sendSuccess(res, message, data, 201);
  }

  /**
   * Send no content response
   * @param {Response} res - Express response
   */
  sendNoContent(res) {
    res.status(204).end();
  }

  /**
   * Validate required fields
   * @param {Object} body - Request body
   * @param {Array<string>} requiredFields - Required field names
   * @throws {AppError} If validation fails
   */
  validateRequired(body, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw AppError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Extract pagination parameters from query
   * @param {Object} query - Request query
   * @returns {Object} Pagination parameters
   */
  getPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }
}

module.exports = BaseController;