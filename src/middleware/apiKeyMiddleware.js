/**
 * Simple API Key Authentication Middleware
 */
exports.validateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API Key is required',
      });
    }

    if (apiKey !== process.env.WA_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key',
      });
    }

    // Valid API Key
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API Key validation error',
    });
  }
};
