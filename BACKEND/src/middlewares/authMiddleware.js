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

module.exports = {
  verifyToken,
  verifyJwt,
};
