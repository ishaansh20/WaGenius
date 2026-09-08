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

module.exports = {
  verifyPlatformToken,
};
