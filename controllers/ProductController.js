const mongoose = require("mongoose");
const Product = require("../models/ProductModel");
const OfferModel = require("../models/OfferModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify, generateRandomCode } = require("../utils/helpers.js");
const { addProductSchema } = require("../utils/validationSchemas");
const { firstLetterInStringToUppercase } = require("../utils/helpers");
const { cloudinary, uploadImage } = require("../utils/cloudinary");
const CategoryModel = require("../models/CategoryModel");
const paginate = require("../utils/paginate");
const { syncOfferProducts } = require("../utils/offerSyncHelper");

//get all products (admin / all)
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page, limit, q, status, category } = req.query;

    const query = { isDeleted: false };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { productCode: { $regex: q, $options: "i" } },
      ];
    }

    if (status && status !== "All") {
      query.isPublished = status === "published";
    }

    if (category && category !== "All") {
      const subcategories = await CategoryModel.find({
        parent: category,
        isDeleted: false,
      }).select("_id");
      const categoryIds = [category, ...subcategories.map((sub) => sub._id)];
      query.category = { $in: categoryIds };
    }

    const result = await paginate(Product, query, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      populate: ["category", "currentOffer"],
      sort: { createdAt: -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Products fetch successful",
      products: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

//get published products (customer storefront)
exports.getPublishedProducts = async (req, res, next) => {
  try {
    const { page, limit, q, category, sort, minPrice, maxPrice, brands, offer } =
      req.query;

    const query = { isDeleted: false, isPublished: true };

    if (offer && mongoose.Types.ObjectId.isValid(offer)) {
      query.currentOffer = new mongoose.Types.ObjectId(offer);
    }

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { productCode: { $regex: q, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      const subcategories = await CategoryModel.find({
        parent: category,
        isDeleted: false,
      }).select("_id");
      const categoryIds = [category, ...subcategories.map((sub) => sub._id)];
      query.category = { $in: categoryIds };
    }

    // Get available brands matching query (before price and brand filters are applied)
    const availableBrands = await Product.distinct("brand", query);

    // Apply price range filter (matching active price: discountPrice if set, otherwise regular price)
    if (minPrice || maxPrice) {
      const min = Number(minPrice) || 0;
      const max = Number(maxPrice) || 999999999;

      query.$or = [
        {
          discountPrice: { $gt: 0, $gte: min, $lte: max },
        },
        {
          $and: [
            {
              $or: [
                { discountPrice: { $exists: false } },
                { discountPrice: { $lte: 0 } },
              ],
            },
            { price: { $gte: min, $lte: max } },
          ],
        },
      ];
    }

    // Apply brand filter (comma separated list)
    if (brands) {
      const brandList = brands
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);
      if (brandList.length > 0) {
        query.brand = { $in: brandList };
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      switch (sort) {
        case "price-asc":
          sortOption = { price: 1 };
          break;
        case "price-desc":
          sortOption = { price: -1 };
          break;
        case "name-asc":
          sortOption = { name: 1 };
          break;
        case "name-desc":
          sortOption = { name: -1 };
          break;
        case "newest":
        default:
          sortOption = { createdAt: -1 };
          break;
      }
    }

    const result = await paginate(Product, query, {
      page: Number(page) || 1,
      limit: Number(limit) || 12,
      populate: ["category", "currentOffer"],
      sort: sortOption,
    });

    return res.status(200).json({
      success: true,
      message: "Published products fetched successfully",
      products: result.data,
      pagination: result.pagination,
      brands: availableBrands,
    });
  } catch (error) {
    return next(error);
  }
};

//get products by category
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryid } = req.params;
    const { page, limit, q, status } = req.query;

    const subcategories = await CategoryModel.find({
      parent: categoryid,
      isDeleted: false,
    }).select("_id");
    const categoryIds = [categoryid, ...subcategories.map((sub) => sub._id)];

    const query = { category: { $in: categoryIds }, isDeleted: false };

    if (q) {
      query.name = { $regex: q, $options: "i" };
    }

    if (status && status !== "All") {
      query.isPublished = status === "published";
    }

    const result = await paginate(Product, query, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      populate: ["category", "currentOffer"],
      sort: { createdAt: -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Category products fetched successfully",
      products: result.data,
      pagination: result.pagination,
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

    if (currentOffer) {
      if (!mongoose.Types.ObjectId.isValid(currentOffer)) {
        return next(
          new ErrorResponse("Invalid Offer ID!", 400, "validationError"),
        );
      }

      const offerExists = await OfferModel.findOne({ _id: currentOffer });
      if (!offerExists) {
        return next(
          new ErrorResponse(
            "The Selected Offer Was Not Found!",
            404,
            "notFound",
          ),
        );
      }
    }

    //upload image and save url and id of image
    let images_uploads = [];
    try {
      //upload for property images (field: 'images') — direct from memory buffer
      if (req?.files?.images?.length > 0) {
        console.log("handling files...");
        const resultsOne = await Promise.all(
          req.files.images.map((file) =>
            uploadImage(file, { folder: "goSolar/products" }),
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
      name: name,
      slug: `${slugify(name)}-${generateRandomCode(4)}`,
      description,
      additionalInfo,
      category,
      quantityInStock: Number(quantityInStock) || 0,
      price: Number(price),
      discountPrice: Number(discountPrice) || 0,
      manualDiscountPrice: Number(discountPrice) || 0,
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
    if (discountPrice !== undefined) {
      req.body.discountPrice = Number(discountPrice) || 0;
      req.body.manualDiscountPrice = Number(discountPrice) || 0;
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

    // If an imgId is provided, we try to update that specific image in-place
    if (imgId && imgId !== "new") {
      const imgToUpdate = product.images.filter((im) => im.public_id == imgId);
      if (imgToUpdate?.length > 0) {
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
        }
      }
    }

    // Otherwise, we append a new image (upload as new)
    if (product.images.length >= 5) {
      return next(
        new ErrorResponse(
          "Product already has the maximum of 5 images.",
          400,
          "validationError",
        ),
      );
    }

    const newImg = await uploadImage(req.file, {
      folder: "goSolar/products",
    });

    if (newImg?.url && newImg?.public_id) {
      product.images.push({
        url: newImg.url,
        public_id: newImg.public_id,
      });

      await product.save();

      return res.status(200).json({
        success: true,
        message: "Image added to product successfully",
        product,
      });
    } else {
      return next(
        new ErrorResponse(
          "An unexpected error occured while trying to upload your image",
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

exports.updateProductsOffer = async (req, res, next) => {
  const { products, offer } = req.body;

  if (!Array.isArray(products) || !offer) {
    return next(
      new ErrorResponse("Invalid request format", 400, "validationError"),
    );
  }

  try {
    // Validate the offer ID
    if (!mongoose.Types.ObjectId.isValid(offer)) {
      return next(
        new ErrorResponse("Invalid offer ID", 400, "validationError"),
      );
    }

    // Validate each product ID
    for (const productId of products) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(
          new ErrorResponse(
            `Invalid product ID: ${productId}`,
            400,
            "validationError",
          ),
        );
      }
    }

    const offerDoc = await OfferModel.findById(offer);
    if (!offerDoc) {
      return next(
        new ErrorResponse("Sales offer not found", 404, "validationError"),
      );
    }

    // Merge product IDs into the offer's list avoiding duplicates
    const existingProductIds = offerDoc.products.map(p => p.toString());
    const newProductIds = products.filter(id => !existingProductIds.includes(id));
    if (newProductIds.length > 0) {
      offerDoc.products.push(...newProductIds);
      await offerDoc.save();
    }

    await syncOfferProducts(offer);

    // Retrieve the updated products
    const updatedProducts = await Product.find({
      _id: { $in: products },
    }).lean();

    res.status(200).json({
      message: "Products offer updated successfully",
      products: updatedProducts,
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorResponse("Internal server error", 500, "serverError"));
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
    product.currentOffer = null;
    product.discountPrice = product.manualDiscountPrice || 0;
    await product.save();

    // Remove this product from any sales offers lists
    await OfferModel.updateMany(
      { products: productid },
      { $pull: { products: productid } }
    );

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
