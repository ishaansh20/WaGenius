const express = require("express");

const router = express.Router();

const {
  createCategory,
  getCategories,
} = require("../controllers/templateCategoryController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");

const PERMISSIONS = require("../constants/permissions");

// GET ALL CATEGORIES

router.get(
  "/",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_VIEW),
  getCategories,
);

// CREATE CATEGORY

router.post(
  "/",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  createCategory,
);

module.exports = router;
