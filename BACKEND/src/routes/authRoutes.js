const express = require("express");
const { login, registerCompany } = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/register-company", registerCompany);
router.get("/me", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.get("/admin-test", verifyToken, authorize(["ADMIN"]), (req, res) => {
  res.json({
    success: true,
    message: "Welcome Admin",
    user: req.user,
  });
});

module.exports = router;
