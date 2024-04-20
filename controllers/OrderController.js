const OrderModel = require("../models/OrderModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { idGenerator, addDaysToCurrentDate } = require("../utils/helpers.js");
const { dateStringToReadableDate } = require("../utils/helpers");
const { addOrderSchema } = require("../utils/validationSchemas");
const fs = require("fs");
const mongoose = require("mongoose");
const { cloudinary } = require("../utils/cloudinary");
const ProductModel = require("../models/ProductModel");
const TrackingIdModel = require("../models/TrackingId");
const PaystackAPI = require("../utils/paystack");
const { sendEmail } = require("../utils/sendEmail");
const UserModel = require("../models/UserModel");

exports.createOrder = async (req, res, next) => {
  try {
    const {
      products,
      paymentReference,
      paymentMethod,
      totalPricePaid,
      deliveryDetails,
    } = req.body;

    const user = req.user;
    if (!user) {
      return next(
        new ErrorResponse("Please login to continue!", 401, "unauthorized")
      );
    }

    let itemsArray = [];

    for (const product of products) {
      if (product?.qty < 1 || !product?.qty) {
        return next(
          new ErrorResponse("Invalid product Quantity!", 400, "validationError")
        );
      }

      if (!product?.deliveryFee) {
        return next(
          new ErrorResponse(
            `Deleivery fee for product with ID:${product?.product} is required !`,
            400,
            "validationError"
          )
        );
      }

      if (!mongoose.Types.ObjectId.isValid(product?.product)) {
        return next(
          new ErrorResponse("Invalid product ID!", 400, "validationError")
        );
      }

      //check if products to be purchased still exists or is out of stock
      const productExists = await ProductModel.findOne({
        _id: product.product,
        isDeleted: false,
      });
      if (!productExists) {
        return next(
          new ErrorResponse(
            `product with ID: ${product.product}, may have been deleted already!`,
            404,
            "validationError"
          )
        );
      }

      if (productExists.quantityInStock < product.qty) {
        return next(
          new ErrorResponse(
            `Quantity requested(${product.qty}), is above the quantity in stock(${productExists.quantityInStock}), for the product: ${productExists.name}!`,
            404,
            "validationError"
          )
        );
      }

      itemsArray.push({
        itemName: productExists.name,
        itemQty: product.qty,
        itemPrice: productExists.price,
        discountPercentageOff: "0% OFF",
        delivery: product.deliveryFee,
      });
    }

    try {
      await addOrderSchema.validate(req.body, { abortEarly: true });
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    //check if order with the same ref exists
    const orderRefExists = await OrderModel.findOne({
      paymentReference: paymentReference,
    });
    if (orderRefExists) {
      return next(
        new ErrorResponse("Invalid payment ref!", 400, "validationError")
      );
    }

    //check payment methods
    if (paymentMethod.toLowerCase() === "paystack") {
      //validate paystack payment
      // let paymentVerified = false
      const PayStackAPI = new PaystackAPI();
      const verifiedPayment = await PayStackAPI.verifyPayment(paymentReference);
      //   console.log({ verifiedPayment });

      if (!verifiedPayment.status && !verifiedPayment.data) {
        const errorMessage =
          "Payment verification failed. Please check your payment details and try again. If the issue persists, please contact customer support.";

        return next(new ErrorResponse(errorMessage, 400, "validationError"));
      } else {
        // paymentVerified = true
        //create order
        const newOrder = await OrderModel.create({
          ...req.body,
          user: user?._id,
        });
        if (!newOrder) {
          new ErrorResponse(
            `An unexpected error occured`,
            500,
            "validationError"
          );
        }

        //generate and save tracking id
        const trackingIdGenerator = new idGenerator();
        const trackingID = await trackingIdGenerator.generateTrackingID(
          TrackingIdModel,
          newOrder._id
        );

        const trackingIdDoc = await TrackingIdModel.findOne({
          tracking_id: trackingID,
        });
        newOrder.trackingId = trackingIdDoc._id;
        await newOrder.save();

        //emails

        const { suiteNumber, streetAddress, city, zipCode } = deliveryDetails;
        const cityAndZip = `${city} ${zipCode}`;
        let totDeliveryFee = 0;
        let totCost = 0;
        let subTotalPrice = 0;
        itemsArray.forEach((itm) => {
          totDeliveryFee = totDeliveryFee + itm.delivery;
          totCost = totCost + itm.itemPrice * itm.itemQty;
        });

        subTotalPrice = totCost;
        console.log({ totCost, totDeliveryFee, subTotalPrice });

        const estimatedDaysForDelivery = 7;
        const estimatedDateOfDelivery = addDaysToCurrentDate(
          estimatedDaysForDelivery
        );
        const formattedDeliveryDateEstimate = dateStringToReadableDate(
          estimatedDateOfDelivery
        );

        let orderConfirmedEmailData = {
          from: config.EMAIL_FROM,
          to: user.email,
          name: user.firstname,
          subject: "Order Confirmed",
          template: "order-confirmed",
          trackingId: trackingID,
          items: itemsArray,
          deliveryFee: totDeliveryFee.toLocaleString("en-US", {
            style: "currency",
            currency: "NGN",
          }),
          totalCost: totCost.toLocaleString("en-US", {
            style: "currency",
            currency: "NGN",
          }),
          subTotalPrice: subTotalPrice.toLocaleString("en-US", {
            style: "currency",
            currency: "NGN",
          }),
          suiteNumber,
          streetAddress,
          cityAndZip,
          estimatedDeliveryDate: formattedDeliveryDateEstimate,
        };

        //send buyers copy email
        sendEmail(orderConfirmedEmailData);

        //admins email copy
        const admins = await UserModel.find({
          $or: [{ isAdmin: true }, { isSuperAdmin: true }],
        });

        for (const admin of admins) {
          const adminDiscount = 0;
          let adminEmailData = {
            from: config.EMAIL_FROM,
            to: admin.email,
            name: admin.firstname,
            subject: "New Order Recieved",
            template: "order-recieved",
            trackingId: trackingID,
            items: itemsArray,
            discountPercentageOff: "0% OFF",
            appliedDiscount: adminDiscount.toLocaleString("en-US", {
              style: "currency",
              currency: "NGN",
            }),
            deliveryFee: totDeliveryFee.toLocaleString("en-US", {
              style: "currency",
              currency: "NGN",
            }),
            totalCost: totCost.toLocaleString("en-US", {
              style: "currency",
              currency: "NGN",
            }),
            subTotalPrice: subTotalPrice.toLocaleString("en-US", {
              style: "currency",
              currency: "NGN",
            }),
            suiteNumber,
            streetAddress,
            cityAndZip,
            estimatedDeliveryDate: formattedDeliveryDateEstimate,
          };

          sendEmail(adminEmailData);
        }

        return res.status(201).json({
          success: true,
          message: "Order Placed successfully",
          order: newOrder,
        });
      }
    } else {
      return next(
        new ErrorResponse(`Unsupported payment method`, 400, "validationError")
      );
    }
  } catch (error) {
    return next(error);
  }
};

exports.updateOrderTrackingLevel = async (req, res, next) => {
  try {
    const { trackingLevel, trackingId } = req.body;

    const orderToBeUpdated = await OrderModel.findOne({ trackingId });
    if (!orderToBeUpdated) {
      return next(
        new ErrorResponse("Order not found!", 404, "validationError")
      );
    }

    let trackingStatus = "Processing";
    if (trackingLevel === 1) {
      trackingStatus = "Processing";
    } else if (trackingLevel === 2) {
      const loggedInUser = req.user;
      if (loggedInUser?.isAdmin || loggedInUser?.isSuperAdmin) {
        trackingStatus = "Delivered";
      } else {
        return next(
          new ErrorResponse(
            "You are not authorized to perform this operation!",
            401,
            "unauthorized"
          )
        );
      }
    } else if (trackingLevel === 3) {
      trackingStatus = "Recieved";
    } else {
      return next(
        new ErrorResponse(
          "Invalid tracking status sent!",
          400,
          "validationError"
        )
      );
    }

    orderToBeUpdated.trackingLevel = trackingLevel;
    orderToBeUpdated.trackingStatus = trackingStatus;
    await orderToBeUpdated.save();

    return res.status(201).json({
      success: true,
      message: "Tracking Status Updated successfully",
      order: orderToBeUpdated,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await OrderModel.find({})
      .populate(["user", "trackingId", "products.product"])
      .sort({
        createdAt: -1,
      })
      .exec();
    return res.status(200).json({
      success: true,
      message: "Orders fetch successful",
      orders,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req?.user?._id;
    const orders = await OrderModel.find({ user: userId })
      .populate(["user", "trackingId", "products.product"])
      .sort({
        createdAt: -1,
      })
      .exec();
    return res.status(200).json({
      success: true,
      message: "Orders fetch successful",
      orders,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { orderid } = req?.params;
    const order = await OrderModel.findOne({ _id: orderid })
      .populate(["user", "trackingId", "products.product"])
      .sort({
        createdAt: -1,
      })
      .exec();

    if (!order) {
      return next(new ErrorResponse("Order not found!", 404, "notFound"));
    }

    return res.status(200).json({
      success: true,
      message: "Order fetch successful",
      order,
    });
  } catch (error) {
    return next(error);
  }
};
