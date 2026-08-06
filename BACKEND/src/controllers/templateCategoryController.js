const TemplateCategory = require("../models/templateCategory");

// CREATE CATEGORY

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    // check existing category

    const existingCategory = await TemplateCategory.findOne({
      companyId: req.companyId,
      name: name.trim(),
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await TemplateCategory.create({
      companyId: req.companyId,
      name: name.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// GET ALL CATEGORIES

const getCategories = async (req, res) => {
  try {
    const categories = await TemplateCategory.find({ companyId: req.companyId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
};
