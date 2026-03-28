/**
 * Standard API Response class for consistent API responses
 */
class ApiResponse {
  constructor(success, message, data = null, meta = null) {
    this.success = success;
    this.message = message;
    this.timestamp = new Date().toISOString();
    
    if (data !== null) {
      this.data = data;
    }
    
    if (meta !== null) {
      this.meta = meta;
    }
  }

  static success(message = 'Success', data = null, meta = null) {
    return new ApiResponse(true, message, data, meta);
  }

  static error(message = 'Error', errors = null) {
    const response = new ApiResponse(false, message);
    if (errors) {
      response.errors = Array.isArray(errors) ? errors : [errors];
    }
    return response;
  }

  static paginated(data, page, limit, total) {
    return new ApiResponse(true, 'Success', data, {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
}

module.exports = ApiResponse;