const mongoose = require("mongoose");
const Product = require("../models/ProductModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify, generateRandomCode } = require("../utils/helpers.js");
const { addProductSchema } = require("../utils/validationSchemas");
const { firstLetterInStringToUppercase } = require("../utils/helpers");
const { cloudinary, uploadImage } = require("../utils/cloudinary");
const CategoryModel = require("../models/CategoryModel");

//get all products (admin / all)
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isDeleted: false })
      .populate(["category", "currentOffer"])
      .sort({
        createdAt: -1,
      })
      .exec();
    return res.status(200).json({
      success: true,
      message: "Products fetch successful",
      products,
    });
  } catch (error) {
    return next(error);
  }
};

//get published products (customer storefront)
exports.getPublishedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isDeleted: false, isPublished: true })
      .populate(["category", "currentOffer"])
      .sort({
        createdAt: -1,
      })
      .exec();
    return res.status(200).json({
      success: true,
      message: "Published products fetched successfully",
      products,
    });
  } catch (error) {
    return next(error);
  }
};

//add product
exports.addProducts = async (req, res, next) => {
  try {
    const {
      category,
      name,
      description,
      price,
      discountPrice,
      shippingClass,
      quantityInStock,
      brand,
      additionalInfo,
      outsideLocationDeliveryFee,
      withinLocationDeliveryFee,
      currentOffer,
      datasheet,
      showDatasheet,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return next(
        new ErrorResponse("Invalid Category ID!", 400, "validationError"),
      );
    }

    //validate user input
    try {
      await addProductSchema.validate(req.body, { abortEarly: true });
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    if (brand && brand.length > 50) {
      return next(
        new ErrorResponse("Brand name is too long.", 400, "validationError"),
      );
    }

    if (additionalInfo && additionalInfo.length > 300) {
      return next(
        new ErrorResponse(
          "Additional info is too long. it cannot be more than 300 characters",
          400,
          "validationError",
        ),
      );
    }

    //upload image and save url and id of image
    let images_uploads = [];
    try {
      //upload for property images (field: 'images') — direct from memory buffer
      if (req?.files?.images?.length > 0) {
        console.log("handling files...");
        const resultsOne = await Promise.all(
          req.files.images.map((file) =>
            uploadImage(file, { folder: "goSolar" }),
          ),
        );

        images_uploads = resultsOne;
        console.log({ images_uploads });
      }
    } catch (err) {
      return next(new ErrorResponse(err.message, 500, "uploadError"));
    }

    let parsedDatasheet = [];
    if (datasheet) {
      try {
        parsedDatasheet =
          typeof datasheet === "string" ? JSON.parse(datasheet) : datasheet;
      } catch (e) {
        parsedDatasheet = [];
      }
    }

    const productData = {
      name: name.toUpperCase(),
      slug: `${slugify(name)}-${generateRandomCode(4)}`,
      description,
      additionalInfo,
      category,
      quantityInStock: Number(quantityInStock) || 0,
      price: Number(price),
      discountPrice: Number(discountPrice) || 0,
      shippingClass: shippingClass || "standard",
      brand,
      images: images_uploads,
      outsideLocationDeliveryFee: Number(outsideLocationDeliveryFee) || 0,
      withinLocationDeliveryFee: Number(withinLocationDeliveryFee) || 0,
      currentOffer:
        currentOffer && mongoose.Types.ObjectId.isValid(currentOffer)
          ? currentOffer
          : null,
      datasheet: parsedDatasheet,
      showDatasheet: showDatasheet === true || showDatasheet === "true",
    };

    const newProduct = await Product.create(productData);
    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const {
      productId,
      name,
      description,
      additionalInfo,
      category,
      price,
      discountPrice,
      shippingClass,
      brand,
      quantityInStock,
      datasheet,
      showDatasheet,
      currentOffer,
    } = req.body;

    //validations

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(
        new ErrorResponse("Invalid product ID!", 400, "validationError"),
      );
    }

    const productToBeUpdated = await Product.findById(productId);
    if (!productToBeUpdated) {
      return next(
        new ErrorResponse("Product not found!", 404, "validationError"),
      );
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return next(
          new ErrorResponse("Invalid category ID!", 400, "validationError"),
        );
      }

      const categoryToBeUpdated = await CategoryModel.findById(category);
      if (!categoryToBeUpdated) {
        return next(
          new ErrorResponse("Category not found!", 404, "validationError"),
        );
      }
    }

    if (name) {
      if (name.length > 80 || name.length < 3) {
        return next(
          new ErrorResponse(
            "The field 'Name', cannot be more than 80 characters long and lesser than 3 characters",
            400,
            "validationError",
          ),
        );
      }
    }

    if (description) {
      if (description.length > 350 || description.length < 5) {
        return next(
          new ErrorResponse(
            "The field 'Description', cannot be more than 350 characters long and lesser than 5 characters",
            400,
            "validationError",
          ),
        );
      }
    }

    if (additionalInfo) {
      if (additionalInfo.length > 300 || additionalInfo.length < 5) {
        return next(
          new ErrorResponse(
            "The field 'Additional Information', cannot be more than 300 characters long and lesser than 5 characters",
            400,
            "validationError",
          ),
        );
      }
    }

    if (brand) {
      console.log("there is brand...");
      if (brand.length > 50) {
        return next(
          new ErrorResponse(
            "The field 'Brand', cannot be more than 50 characters long",
            400,
            "validationError",
          ),
        );
      }
    }

    if (price) {
      if (Number(price) > 1000000000 || Number(price) < 50) {
        return next(
          new ErrorResponse(
            "Price cannot be more than 'NGN 1000000000' or lesser than NGN 50",
            400,
            "validationError",
          ),
        );
      }
    }

    if (quantityInStock) {
      if (Number(quantityInStock) > 10000) {
        return next(
          new ErrorResponse(
            "Quantity In Stock cannot be more than '10000'",
            400,
            "validationError",
          ),
        );
      }
    }

    //filter empty fields from req.body, so no field is updated without data
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
    console.log({ cleanedData });

    //update document after validations for available fields are complete
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { ...cleanedData },
      { new: true },
    );
    // console.log({ updatedProduct });
    if (updatedProduct) {
      return res.status(200).json({
        success: true,
        message: "product updated successfully",
        product: updatedProduct,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update product",
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateProductImage = async (req, res, next) => {
  try {
    console.log("rq??", req.file);
    if (!req.file) {
      return next(
        new ErrorResponse("Please add an image", 400, "validationError"),
      );
    }

    const { productId, imgId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(
        new ErrorResponse("Invalid product ID!", 400, "validationError"),
      );
    }

    //find product
    const product = await Product.findById(productId);
    if (!product) {
      return next(
        new ErrorResponse("Product not found", 404, "validationError"),
      );
    }

    //find img to be updated
    const imgToUpdate = product.images.filter((im) => im.public_id == imgId);

    if (!imgToUpdate?.length) {
      return next(
        new ErrorResponse("Image to update not found", 404, "validationError"),
      );
    }

    const remainingImgs = product.images.filter(
      (img) => img.public_id != imgId,
    );

    //update img — upload directly from memory buffer
    const imgUpdate = await uploadImage(req.file, {
      public_id: imgId,
      overwrite: true,
      invalidate: true,
    });

    console.log({ imgUpdate });

    if (imgUpdate?.url && imgUpdate?.public_id) {
      remainingImgs.push({
        url: imgUpdate.url,
        public_id: imgUpdate.public_id,
      });

      product.images = remainingImgs;
      await product.save();

      return res.status(200).json({
        success: true,
        message: "product image updated successfully",
        product,
      });
    } else {
      return next(
        new ErrorResponse(
          "An unexpected error occured while trying to update your image",
          500,
          "validationError",
        ),
      );
    }
  } catch (error) {
    return next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const { productid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productid)) {
      return next(
        new ErrorResponse("Invalid product ID!", 400, "validationError"),
      );
    }

    const product = await Product.findOne({ _id: productid, isDeleted: false })
      .populate(["category", "currentOffer"])
      .exec();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found!",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetch successfull",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { productid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productid)) {
      return next(
        new ErrorResponse("Invalid product ID!", 400, "validationError"),
      );
    }

    const product = await Product.findOne({ _id: productid });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found!",
      });
    }

    product.isDeleted = true;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
