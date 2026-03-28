const AppError = require('../utils/AppError');
const { createModuleLogger } = require('../config/logger');

/**
 * Base Service class with common business logic functionality
 * Implements Template Method pattern for consistent service behavior
 */
class BaseService {
  constructor(moduleName) {
    this.logger = createModuleLogger(moduleName);
  }

  /**
   * Execute a service operation with logging and error handling
   * @param {string} operation - Operation name for logging
   * @param {Function} handler - Async handler function
   * @param {Object} context - Additional context for logging
   * @returns {Promise<*>} Operation result
   */
  async execute(operation, handler, context = {}) {
    this.logger.info({ operation, ...context }, `Starting ${operation}`);
    
    try {
      const result = await handler();
      this.logger.info({ operation, ...context }, `Completed ${operation}`);
      return result;
    } catch (error) {
      this.logger.error({ err: error, operation, ...context }, `Failed ${operation}`);
      throw error;
    }
  }

  /**
   * Validate that a resource exists
   * @param {*} resource - Resource to validate
   * @param {string} resourceName - Resource name for error message
   * @throws {AppError} If resource not found
   */
  validateExists(resource, resourceName = 'Resource') {
    if (!resource) {
      throw AppError.notFound(`${resourceName} not found`);
    }
    return resource;
  }

  /**
   * Validate user ownership
   * @param {string} resourceUserId - Resource owner ID
   * @param {string} currentUserId - Current user ID
   * @throws {AppError} If user doesn't own resource
   */
  validateOwnership(resourceUserId, currentUserId) {
    if (resourceUserId.toString() !== currentUserId.toString()) {
      throw AppError.forbidden('You do not have permission to access this resource');
    }
  }

  /**
   * Create a cache key from parameters
   * @param  {...string} parts - Key parts
   * @returns {string} Cache key
   */
  createCacheKey(...parts) {
    return parts.map((p) => String(p).toLowerCase().trim()).join('__');
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Paginate query results
   * @param {Query} query - Mongoose query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async paginate(query, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [results, total] = await Promise.all([
      query.skip(skip).limit(limit).exec(),
      query.model.countDocuments(query.getFilter()),
    ]);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = BaseService;