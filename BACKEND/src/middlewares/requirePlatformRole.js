// Mirror image of roleMiddleware.js's authorize() but for the platform
// tier — entirely separate check, since platform routes must never be
// reachable by an ordinary company role, and vice versa.
const requirePlatformRole = (allowedPlatformRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user?.platformRole || !allowedPlatformRoles.includes(req.user.platformRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization error",
      });
    }
  };
};

module.exports = { requirePlatformRole };
