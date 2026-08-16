const mongoose = require("mongoose");
const Category = require("../models/CategoryModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify } = require("../utils/helpers.js");
const { categoryValidationSchema } = require("../utils/validationSchemas");
const { firstLetterInStringToUppercase } = require("../utils/helpers");
const paginate = require("../utils/paginate");

//create category
exports.addCategory = async (req, res, next) => {
  try {
    const { name, description, parent, icon, sortOrder } = req.body;

    //validate user input
    try {
      await categoryValidationSchema.validate(req.body, { abortEarly: true });
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    const catDbName = firstLetterInStringToUppercase(name);
    const catExist = await Category.findOne({ name: catDbName });
    if (catExist) {
      return next(
        new ErrorResponse(
          "Another category with the same name already exists!",
          400,
          "duplicateKeys"
        )
      );
    }

    // validate parent if provided
    if (parent && !mongoose.Types.ObjectId.isValid(parent)) {
      return next(new ErrorResponse("Invalid parent category ID!", 400, "validationError"));
    }

    const categoryData = {
      slug: slugify(name),
      name: firstLetterInStringToUppercase(name),
      description,
      parent: parent || null,
      icon: icon || null,
      sortOrder: sortOrder || 0,
    };

    const newCategory = await Category.create({ ...categoryData });
    if (newCategory) {
      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        category: newCategory,
      });
    }
  } catch (error) {
    return next(error);
  }
};

//get all categories (flat list)
exports.getAllCategories = async (req, res, next) => {
  try {
    const { page, limit, q, parent } = req.query;

    const query = { isDeleted: false };

    if (q) {
      query.name = { $regex: q, $options: "i" };
    }

    if (parent !== undefined) {
      if (parent === "null" || parent === "none") {
        query.parent = null;
      } else if (parent === "any") {
        query.parent = { $ne: null };
      } else if (mongoose.Types.ObjectId.isValid(parent)) {
        query.parent = parent;
      }
    }

    const result = await paginate(
      Category,
      query,
      {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        populate: { path: "parent", select: "name slug" },
        sort: { sortOrder: 1, createdAt: -1 }
      }
    );

    return res.status(200).json({
      success: true,
      message: "Categories fetch successful",
      categories: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// get categories as a nested tree: top-level + their subcategories
exports.getCategoryTree = async (req, res, next) => {
  try {
    const allCategories = await Category.find({ isDeleted: false }).sort({
      sortOrder: 1,
    });

    const topLevel = allCategories.filter((c) => !c.parent);
    const tree = topLevel.map((parent) => ({
      ...parent.toObject(),
      subcategories: allCategories.filter(
        (c) => c.parent && c.parent.toString() === parent._id.toString()
      ),
    }));

    return res.status(200).json({
      success: true,
      message: "Category tree fetch successful",
      categories: tree,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findOne({ isDeleted: false, _id: id });

    if (!category) {
      return next(
        new ErrorResponse("Category not found!", 404, "validationError")
      );
    }

    return res.status(200).json({
      success: true,
      message: "category fetch successful",
      category,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, categoryId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return next(
        new ErrorResponse("Invalid category ID!", 400, "validationError")
      );
    }

    const categoryToBeUpdated = await Category.findById(categoryId);

    if (!categoryToBeUpdated) {
      return next(
        new ErrorResponse("Category not found!", 404, "validationError")
      );
    }

    if (categoryToBeUpdated?.isDeleted) {
      return next(
        new ErrorResponse("Category not found!", 404, "validationError")
      );
    }

    if (name) {
      if (name?.length) {
        if (name.length > 100 || name.length < 2) {
          return next(
            new ErrorResponse(
              "The field 'Name', cannot be more than 100 characters long and lesser than 2 characters",
              400,
              "validationError"
            )
          );
        }
      }

      req.body.slug = slugify(name);
    }

    if (description) {
      if (description?.length) {
        if (description.length > 250 || description.length < 5) {
          return next(
            new ErrorResponse(
              "The field 'Description', cannot be more than 250 characters long and lesser than 5 characters",
              400,
              "validationError"
            )
          );
        }
      }
    }

    const cleanUpdateData = (updateData) => {
      const cleanedData = Object.keys(updateData).reduce((acc, key) => {
        const value = updateData[key];
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0)
        ) {
          acc[key] = value;
        }
        return acc;
      }, {});
      return cleanedData;
    };

    const cleanedData = cleanUpdateData(req.body);

    //update document after validations for available fields are complete
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: categoryId },
      { ...cleanedData },
      { new: true }
    );

    if (updatedCategory) {
      return res.status(200).json({
        success: true,
        message: "Categoty updated successfully",
        category: updatedCategory,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update category!",
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(
        new ErrorResponse("Invalid category ID!", 400, "validationError")
      );
    }

    const categoryToBeUpdated = await Category.findById(id);
    if (!categoryToBeUpdated) {
      return next(
        new ErrorResponse("Category not found!", 404, "validationError")
      );
    }

    categoryToBeUpdated.isDeleted = true;
    await categoryToBeUpdated.save();

    return res.status(200).json({
      success: true,
      message: "Categoty deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
