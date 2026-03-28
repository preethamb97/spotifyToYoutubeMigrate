const { createModuleLogger } = require('../config/logger');
const AppError = require('../utils/AppError');

/**
 * Base Repository class for database operations
 * Implements Repository pattern for data access abstraction
 */
class BaseRepository {
  constructor(model, moduleName) {
    this.model = model;
    this.logger = createModuleLogger(moduleName);
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<Document>} Created document
   */
  async create(data) {
    try {
      const document = await this.model.create(data);
      this.logger.debug({ id: document._id }, 'Document created');
      return document;
    } catch (error) {
      this.logger.error({ err: error, data }, 'Failed to create document');
      throw error;
    }
  }

  /**
   * Find document by ID
   * @param {string} id - Document ID
   * @param {Object} options - Query options (populate, select, etc.)
   * @returns {Promise<Document|null>} Found document or null
   */
  async findById(id, options = {}) {
    let query = this.model.findById(id);

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    return query.exec();
  }

  /**
   * Find one document by filter
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options
   * @returns {Promise<Document|null>} Found document or null
   */
  async findOne(filter, options = {}) {
    let query = this.model.findOne(filter);

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    return query.exec();
  }

  /**
   * Find multiple documents
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options (sort, limit, skip, populate, select)
   * @returns {Promise<Array<Document>>} Found documents
   */
  async find(filter, options = {}) {
    let query = this.model.find(filter);

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.skip) {
      query = query.skip(options.skip);
    }

    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    return query.exec();
  }

  /**
   * Find document by ID and update
   * @param {string} id - Document ID
   * @param {Object} update - Update data
   * @param {Object} options - Query options (new, runValidators)
   * @returns {Promise<Document|null>} Updated document or null
   */
  async findByIdAndUpdate(id, update, options = { new: true, runValidators: true }) {
    try {
      const document = await this.model.findByIdAndUpdate(id, update, options);
      this.logger.debug({ id }, 'Document updated');
      return document;
    } catch (error) {
      this.logger.error({ err: error, id }, 'Failed to update document');
      throw error;
    }
  }

  /**
   * Find one document and update
   * @param {Object} filter - Query filter
   * @param {Object} update - Update data
   * @param {Object} options - Query options
   * @returns {Promise<Document|null>} Updated document or null
   */
  async findOneAndUpdate(filter, update, options = { new: true, runValidators: true, upsert: false }) {
    try {
      const document = await this.model.findOneAndUpdate(filter, update, options);
      this.logger.debug({ filter }, 'Document updated');
      return document;
    } catch (error) {
      this.logger.error({ err: error, filter }, 'Failed to update document');
      throw error;
    }
  }

  /**
   * Find document by ID and delete
   * @param {string} id - Document ID
   * @returns {Promise<Document|null>} Deleted document or null
   */
  async findByIdAndDelete(id) {
    try {
      const document = await this.model.findByIdAndDelete(id);
      this.logger.debug({ id }, 'Document deleted');
      return document;
    } catch (error) {
      this.logger.error({ err: error, id }, 'Failed to delete document');
      throw error;
    }
  }

  /**
   * Delete one document
   * @param {Object} filter - Query filter
   * @returns {Promise<Object>} Delete result
   */
  async deleteOne(filter) {
    try {
      const result = await this.model.deleteOne(filter);
      this.logger.debug({ filter, deletedCount: result.deletedCount }, 'Document deleted');
      return result;
    } catch (error) {
      this.logger.error({ err: error, filter }, 'Failed to delete document');
      throw error;
    }
  }

  /**
   * Count documents
   * @param {Object} filter - Query filter
   * @returns {Promise<number>} Document count
   */
  async count(filter = {}) {
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Check if document exists
   * @param {Object} filter - Query filter
   * @returns {Promise<boolean>} True if exists
   */
  async exists(filter) {
    const count = await this.count(filter);
    return count > 0;
  }

  /**
   * Find or create document
   * @param {Object} filter - Query filter
   * @param {Object} data - Data to create if not found
   * @returns {Promise<Array<Document, boolean>>} Document and created flag
   */
  async findOrCreate(filter, data) {
    let document = await this.findOne(filter);
    
    if (document) {
      return [document, false];
    }

    document = await this.create({ ...filter, ...data });
    return [document, true];
  }

  /**
   * Bulk create documents
   * @param {Array<Object>} dataArray - Array of document data
   * @returns {Promise<Array<Document>>} Created documents
   */
  async bulkCreate(dataArray) {
    try {
      const documents = await this.model.insertMany(dataArray, { ordered: true });
      this.logger.debug({ count: documents.length }, 'Documents bulk created');
      return documents;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to bulk create documents');
      throw error;
    }
  }

  /**
   * Aggregate pipeline
   * @param {Array<Object>} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregation results
   */
  async aggregate(pipeline) {
    return this.model.aggregate(pipeline).exec();
  }
}

module.exports = BaseRepository;