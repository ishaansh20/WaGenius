const jwt = require("jsonwebtoken");

const verifyPlatformToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No platform token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);

    req.platformUser = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired platform token.",
    });
  }
};

// Same grace-period rationale as verifyTokenWithGrace in authMiddleware.js
// — used only by the platform refresh endpoint.
const GRACE_PERIOD_MS = 5 * 60 * 1000;

const verifyPlatformTokenWithGrace = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No platform token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET, {
      ignoreExpiration: true,
    });

    const expiredAtMs = decoded.exp * 1000;
    if (Date.now() - expiredAtMs > GRACE_PERIOD_MS) {
      return res.status(401).json({
        success: false,
        message: "Token has expired beyond the refresh grace period.",
      });
    }

    req.platformUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

module.exports = {
  verifyPlatformToken,
  verifyPlatformTokenWithGrace,
};
