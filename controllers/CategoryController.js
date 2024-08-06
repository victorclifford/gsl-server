const mongoose = require("mongoose");
const Category = require("../models/CategoryModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify } = require("../utils/helpers.js");
const { categoryValidationSchema } = require("../utils/validationSchemas");
const { firstLetterInStringToUppercase } = require("../utils/helpers");
const { sendBrevoEmail } = require("../utils/sendBrevoEmail");

//create category
exports.addCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

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

    const categoryData = {
      slug: slugify(name),
      name: firstLetterInStringToUppercase(name),
      description,
    };

    // console.log("catData::", categoryData);

    //create category with Category model
    const newCategory = await Category.create({ ...categoryData });
    if (newCategory) {
      // const allCategories = await Category.find({});

      //return response
      return res.status(201).json({
        success: true,
        message: "category created successfully",
        category: newCategory,
      });
    }
  } catch (error) {
    return next(error);
  }
};

//get all categories
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isDeleted: false }).sort({
      createdAt: -1,
    });

    // sendBrevoEmail({
    //   sender: { name: "Jessy from goSolar", email: "support@mooresub.ng" },
    //   to: [{ email: "victorgiadom29@gmail.com", name: "Victor Cliff" }],
    //   subject: "Test Mail",
    //   templateName: "testTemp",
    //   parameters: { homieeLink: "https://gosolar.ng", SupportAgentName: "Jessy" },
    // });

    return res.status(200).json({
      success: true,
      message: "Categories fetch successful",
      categories,
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
      return next(new ErrorResponse("Category not found!", 404, "validationError"));
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
      return next(new ErrorResponse("Invalid category ID!", 400, "validationError"));
    }

    const categoryToBeUpdated = await Category.findById(categoryId);

    if (!categoryToBeUpdated) {
      return next(new ErrorResponse("Category not found!", 404, "validationError"));
    }

    if (categoryToBeUpdated?.isDeleted) {
      return next(new ErrorResponse("Category not found!", 404, "validationError"));
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
      return next(new ErrorResponse("Invalid category ID!", 400, "validationError"));
    }

    const categoryToBeUpdated = await Category.findById(id);
    if (!categoryToBeUpdated) {
      return next(new ErrorResponse("Category not found!", 404, "validationError"));
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
