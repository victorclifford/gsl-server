const Category = require("../models/CategoryModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify } = require("../utils/helpers.js");
const { categoryValidationSchema } = require("../utils/validationSchemas");
const { firstLetterInStringToUppercase } = require("../utils/helpers");

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

    const catExist = await Category.findOne({ name });
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
      const allCategories = await Category.find({});

      //return response
      return res.status(201).json({
        success: true,
        message: "category created successfully",
        categories: allCategories,
      });
    }
  } catch (error) {
    return next(error);
  }
};

//get all categories
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Categories fetch successful",
      categories,
    });
  } catch (error) {
    return next(error);
  }
};
