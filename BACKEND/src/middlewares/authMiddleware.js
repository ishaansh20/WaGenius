const jwt = require("jsonwebtoken");

// Shared by the Express middleware below and the Socket.IO auth middleware
// in sockets/socket.js — one place that knows how a token gets verified.
const verifyJwt = (token) => jwt.verify(token, process.env.JWT_SECRET);

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    req.user = verifyJwt(token);

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// Used only by the /auth/refresh endpoint. A normal request must reject an
// expired token outright — but a refresh request needs to tolerate a short
// grace period past expiry, since the frontend's refresh attempt can be
// delayed by browser tab throttling (backgrounded tabs slow down timers).
// Without this grace window, a user who briefly switches tabs right as
// their token expires would get logged out even though they were active.
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes past expiry

const verifyTokenWithGrace = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    const expiredAtMs = decoded.exp * 1000;
    if (Date.now() - expiredAtMs > GRACE_PERIOD_MS) {
      return res.status(401).json({
        success: false,
        message: "Token has expired beyond the refresh grace period.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

module.exports = {
  verifyToken,
  verifyJwt,
  verifyTokenWithGrace,
};
