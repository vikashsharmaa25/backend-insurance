import ApiError from '../utils/ApiError.js';

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Assign parsed values back to request
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    
    next();
  } catch (error) {
    const errorMessages = error.errors.map((err) => {
      // Remove the top-level 'body' or 'query' segment from path for cleaner user output
      const cleanPath = err.path.length > 1 ? err.path.slice(1).join('.') : err.path.join('.');
      return {
        field: cleanPath,
        message: err.message,
      };
    });
    
    next(new ApiError(400, 'Validation Error', errorMessages));
  }
};

export default validate;
