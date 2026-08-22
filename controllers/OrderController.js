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
const PackageModel = require("../models/PackageModel");
const PaystackAPI = require("../utils/paystack");
const { sendEmail } = require("../utils/sendEmail");
const { sendBrevoEmail } = require("../utils/sendBrevoEmail");
const UserModel = require("../models/UserModel");
const paginate = require("../utils/paginate");

const calculateBackendOrderTotal = async (products) => {
  let subtotal = 0;
  let shippingFee = 0;

  for (const item of products) {
    if (!mongoose.Types.ObjectId.isValid(item.product)) {
      throw new Error(`Invalid item ID: ${item.product}`);
    }

    const productExists = await ProductModel.findOne({
      _id: item.product,
      isDeleted: false,
    });

    let price = 0;
    if (productExists) {
      price = productExists.price;
    } else {
      const packageExists = await PackageModel.findOne({
        _id: item.product,
      });
      if (!packageExists) {
        throw new Error(`Item with ID: ${item.product} not found or deleted`);
      }
      price = packageExists.price;
    }

    subtotal += price * item.qty;
    shippingFee += item.deliveryFee * item.qty;
  }

  const tax = Math.round(subtotal * 0.05); // 5% VAT
  const total = subtotal + shippingFee + tax;
  return Math.max(0, total);
};

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
        new ErrorResponse("Please login to continue!", 401, "unauthorized"),
      );
    }
    console.log({ paymentReference });
    let itemsArray = [];
    let purchasedProducts = [];
    let resolvedProducts = [];

    for (const item of products) {
      if (item?.qty < 1 || !item?.qty) {
        return next(
          new ErrorResponse(
            "Invalid product Quantity!",
            400,
            "validationError",
          ),
        );
      }

      if (!item?.deliveryFee) {
        return next(
          new ErrorResponse(
            `Deleivery fee for product with ID:${item?.product} is required !`,
            400,
            "validationError",
          ),
        );
      }

      if (!mongoose.Types.ObjectId.isValid(item?.product)) {
        return next(
          new ErrorResponse("Invalid product ID!", 400, "validationError"),
        );
      }

      const productExists = await ProductModel.findOne({
        _id: item.product,
        isDeleted: false,
      });

      if (productExists) {
        if (productExists.quantityInStock < item.qty) {
          return next(
            new ErrorResponse(
              `Quantity requested(${item.qty}), is above the quantity in stock(${productExists.quantityInStock}), for the product: ${productExists.name}!`,
              404,
              "validationError",
            ),
          );
        }

        // Subtract quantity from stock
        productExists.quantityInStock =
          productExists.quantityInStock - parseInt(item.qty);
        purchasedProducts.push(productExists);

        itemsArray.push({
          itemName: productExists.name,
          itemQty: item.qty,
          itemPrice: productExists.price,
          discountPercentageOff: "0% OFF",
          delivery: item.deliveryFee,
        });

        resolvedProducts.push({
          product: item.product,
          qty: item.qty,
          deliveryFee: item.deliveryFee,
          itemModel: "Product",
        });
      } else {
        const packageExists = await PackageModel.findOne({
          _id: item.product,
        }).populate("constituents.product");

        if (!packageExists) {
          return next(
            new ErrorResponse(
              `Product or Package with ID: ${item.product} not found or deleted!`,
              404,
              "validationError",
            ),
          );
        }

        // Check constituent stock
        for (const constituent of packageExists.constituents) {
          const qtyNeeded = constituent.qty * item.qty;
          if (!constituent.product || constituent.product.isDeleted) {
            return next(
              new ErrorResponse(
                `Component product in package ${packageExists.name} is deleted or missing!`,
                404,
                "validationError",
              ),
            );
          }
          if (constituent.product.quantityInStock < qtyNeeded) {
            return next(
              new ErrorResponse(
                `Component product ${constituent.product.name} inside package ${packageExists.name} has insufficient stock (Required: ${qtyNeeded}, In stock: ${constituent.product.quantityInStock})`,
                404,
                "validationError",
              ),
            );
          }

          // Subtract quantity from stock
          constituent.product.quantityInStock -= qtyNeeded;
          purchasedProducts.push(constituent.product);
        }

        itemsArray.push({
          itemName: packageExists.name,
          itemQty: item.qty,
          itemPrice: packageExists.price,
          discountPercentageOff: "0% OFF",
          delivery: item.deliveryFee,
        });

        resolvedProducts.push({
          product: item.product,
          qty: item.qty,
          deliveryFee: item.deliveryFee,
          itemModel: "Package",
        });
      }
    }

    req.body.products = resolvedProducts;

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
        new ErrorResponse("Invalid payment ref!", 400, "validationError"),
      );
    }

    //check payment methods
    if (paymentMethod.toLowerCase() === "paystack") {
      //validate paystack payment
      // let paymentVerified = false
      const PayStackAPI = new PaystackAPI();
      const verifiedPayment = await PayStackAPI.verifyPayment(paymentReference);
      console.log({ verifiedPayment });

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
            "validationError",
          );
        }

        //generate and save tracking id
        const trackingIdGenerator = new idGenerator();
        const trackingID = await trackingIdGenerator.generateTrackingID(
          TrackingIdModel,
          newOrder._id,
        );

        const trackingIdDoc = await TrackingIdModel.findOne({
          tracking_id: trackingID,
        });
        newOrder.trackingId = trackingIdDoc._id;
        await newOrder.save();

        //save subtracted quntity of purchased products
        for (const product of purchasedProducts) {
          product.save();
        }

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
        const totCostWithDelivery = totCost + totDeliveryFee;
        console.log({ totCost, totDeliveryFee, subTotalPrice });

        const estimatedDaysForDelivery = 7;
        const estimatedDateOfDelivery = addDaysToCurrentDate(
          estimatedDaysForDelivery,
        );
        const formattedDeliveryDateEstimate = dateStringToReadableDate(
          estimatedDateOfDelivery,
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
          totalCost: totCostWithDelivery.toLocaleString("en-US", {
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
        // sendEmail(orderConfirmedEmailData);

        sendBrevoEmail({
          // sender: { name: "Jessy from goSolar", email: "support@mooresub.ng" },
          to: [{ email: user.email, name: user.firstname }],
          templateName: "order-confirmed",
          parameters: {
            SupportAgentName: "Jessy",
          },
          ...orderConfirmedEmailData,
        });

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

          // sendEmail(adminEmailData);
          sendBrevoEmail({
            // sender: { name: "Jessy from goSolar", email: "support@mooresub.ng" },
            to: [{ email: admin.email, name: admin.firstname }],
            templateName: "order-recieved",
            parameters: {
              SupportAgentName: "Jessy",
            },
            ...adminEmailData,
          });
        }

        return res.status(201).json({
          success: true,
          message: "Order Placed successfully",
          order: newOrder,
        });
      }
    } else {
      return next(
        new ErrorResponse(`Unsupported payment method`, 400, "validationError"),
      );
    }
  } catch (error) {
    return next(error);
  }
};

exports.updateOrderTrackingLevel = async (req, res, next) => {
  try {
    const { trackingLevel, trackingId } = req.body;

    let orderToBeUpdated;
    if (mongoose.Types.ObjectId.isValid(trackingId)) {
      orderToBeUpdated = await OrderModel.findOne({ trackingId });
    } else {
      const trackingDoc = await TrackingIdModel.findOne({ tracking_id: trackingId });
      if (trackingDoc) {
        orderToBeUpdated = await OrderModel.findOne({ trackingId: trackingDoc._id });
      }
    }

    if (!orderToBeUpdated) {
      return next(
        new ErrorResponse("Order not found!", 404, "validationError"),
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
            "unauthorized",
          ),
        );
      }
    } else if (trackingLevel === 3) {
      trackingStatus = "Recieved";
    } else {
      return next(
        new ErrorResponse(
          "Invalid tracking status sent!",
          400,
          "validationError",
        ),
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
    const { page = 1, limit = 10, q, status } = req.query;

    const query = {};

    if (status && status !== "All") {
      if (status.toLowerCase() === "received") {
        query.trackingStatus = { $in: ["Received", "Recieved"] };
      } else {
        query.trackingStatus = { $regex: new RegExp(`^${status}$`, "i") };
      }
    }

    if (q) {
      const users = await UserModel.find({
        $or: [
          { firstname: { $regex: q, $options: "i" } },
          { lastname: { $regex: q, $options: "i" } },
        ],
      }).select("_id");
      const userIds = users.map((u) => u._id);

      const trackingIdsDoc = await TrackingIdModel.find({
        tracking_id: { $regex: q, $options: "i" },
      }).select("_id");
      const trackingIds = trackingIdsDoc.map((t) => t._id);

      query.$or = [
        { user: { $in: userIds } },
        { trackingId: { $in: trackingIds } },
      ];
    }

    const { data: orders, pagination } = await paginate(OrderModel, query, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sort: { createdAt: -1 },
      populate: ["user", "trackingId", "products.product"],
    });

    return res.status(200).json({
      success: true,
      message: "Orders fetch successful",
      orders,
      pagination,
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

    let query = {};
    if (mongoose.Types.ObjectId.isValid(orderid)) {
      query._id = orderid;
    } else {
      const trackingDoc = await TrackingIdModel.findOne({ tracking_id: orderid });
      if (trackingDoc) {
        query.trackingId = trackingDoc._id;
      } else {
        return next(new ErrorResponse("Order not found!", 404, "notFound"));
      }
    }

    const order = await OrderModel.findOne(query)
      .populate(["user", "trackingId", "products.product"])
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

exports.initializeOrder = async (req, res, next) => {
  try {
    const {
      products,
      paymentMethod,
      deliveryDetails,
    } = req.body;

    const user = req.user;
    if (!user) {
      return next(new ErrorResponse("Please login to continue!", 401, "unauthorized"));
    }

    if (paymentMethod.toLowerCase() !== "paystack") {
      return next(new ErrorResponse("Only Paystack payment method is supported on this endpoint", 400, "validationError"));
    }

    let resolvedProducts = [];

    for (const item of products) {
      if (item?.qty < 1 || !item?.qty) {
        return next(new ErrorResponse("Invalid product Quantity!", 400, "validationError"));
      }

      if (!item?.deliveryFee) {
        return next(new ErrorResponse(`Delivery fee for product with ID:${item?.product} is required!`, 400, "validationError"));
      }

      if (!mongoose.Types.ObjectId.isValid(item?.product)) {
        return next(new ErrorResponse("Invalid product ID!", 400, "validationError"));
      }

      const productExists = await ProductModel.findOne({
        _id: item.product,
        isDeleted: false,
      });

      if (productExists) {
        if (productExists.quantityInStock < item.qty) {
          return next(new ErrorResponse(`Quantity requested(${item.qty}), is above the quantity in stock(${productExists.quantityInStock}), for the product: ${productExists.name}!`, 404, "validationError"));
        }
        resolvedProducts.push({
          product: item.product,
          qty: item.qty,
          deliveryFee: item.deliveryFee,
          itemModel: "Product",
        });
      } else {
        const packageExists = await PackageModel.findOne({
          _id: item.product,
        }).populate("constituents.product");

        if (!packageExists) {
          return next(new ErrorResponse(`Product or Package with ID: ${item.product} not found or deleted!`, 404, "validationError"));
        }

        // Check constituent stock
        for (const constituent of packageExists.constituents) {
          const qtyNeeded = constituent.qty * item.qty;
          if (!constituent.product || constituent.product.isDeleted) {
            return next(new ErrorResponse(`Component product in package ${packageExists.name} is deleted or missing!`, 404, "validationError"));
          }
          if (constituent.product.quantityInStock < qtyNeeded) {
            return next(new ErrorResponse(`Component product ${constituent.product.name} inside package ${packageExists.name} has insufficient stock (Required: ${qtyNeeded}, In stock: ${constituent.product.quantityInStock})`, 404, "validationError"));
          }
        }

        resolvedProducts.push({
          product: item.product,
          qty: item.qty,
          deliveryFee: item.deliveryFee,
          itemModel: "Package",
        });
      }
    }

    req.body.products = resolvedProducts;

    // Backend price recalculation (Secure)
    let calculatedTotal;
    try {
      calculatedTotal = await calculateBackendOrderTotal(products);
    } catch (e) {
      return next(new ErrorResponse(e.message, 404, "validationError"));
    }

    // Force verified server-side total
    req.body.totalPricePaid = calculatedTotal;

    try {
      await addOrderSchema.validate({ ...req.body, paymentReference: "temp-ref" }, { abortEarly: true });
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    const PayStackAPI = new PaystackAPI();
    const paystackPayload = {
      email: user.email,
      amount: Math.round(calculatedTotal * 100), // in kobo
      callback_url: `${config.HOMEPAGE}/checkout/success`,
    };

    const initializeResponse = await PayStackAPI.initializeTransaction(paystackPayload);
    if (!initializeResponse || !initializeResponse.status) {
      return next(new ErrorResponse("Failed to initialize Paystack transaction.", 400, "validationError"));
    }

    // Create order with pending status
    const newOrder = await OrderModel.create({
      ...req.body,
      user: user?._id,
      paymentReference: initializeResponse.data.reference,
      paymentStatus: "pending",
    });

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      authorization_url: initializeResponse.data.authorization_url,
      reference: initializeResponse.data.reference,
    });
  } catch (error) {
    return next(error);
  }
};

const finalizeOrderPayment = async (paymentReference) => {
  // Find the order
  const order = await OrderModel.findOne({ paymentReference }).populate("user");
  if (!order) {
    throw new Error("Order not found!");
  }

  // If already marked as paid, return success (idempotent)
  if (order.paymentStatus === "paid") {
    return order;
  }

  // Call Paystack API to verify
  const PayStackAPI = new PaystackAPI();
  const verifiedPayment = await PayStackAPI.verifyPayment(paymentReference);

  if (!verifiedPayment || !verifiedPayment.status || verifiedPayment.data.status !== "success") {
    order.paymentStatus = "failed";
    await order.save();
    throw new Error("Payment verification failed. The transaction was not successful.");
  }

  // Verify amount matches order amount (amount is in kobo)
  const expectedKoboAmount = Math.round(order.totalPricePaid * 100);
  if (verifiedPayment.data.amount !== expectedKoboAmount) {
    order.paymentStatus = "failed";
    await order.save();
    throw new Error("Payment verification failed. Paid amount does not match the order total.");
  }

  // If verified, finalize order:
  // 1. Decrement stock
  let purchasedProducts = [];
  let itemsArray = [];

  for (const item of order.products) {
    if (item.itemModel === "Product") {
      const productExists = await ProductModel.findOne({
        _id: item.product,
        isDeleted: false,
      });

      if (!productExists) {
        throw new Error(`Product with ID: ${item.product} no longer exists.`);
      }

      if (productExists.quantityInStock < item.qty) {
        throw new Error(`Quantity requested for ${productExists.name} exceeds available stock.`);
      }

      productExists.quantityInStock = productExists.quantityInStock - parseInt(item.qty);
      purchasedProducts.push(productExists);

      itemsArray.push({
        itemName: productExists.name,
        itemQty: item.qty,
        itemPrice: productExists.price,
        discountPercentageOff: "0% OFF",
        delivery: item.deliveryFee,
      });
    } else {
      const packageExists = await PackageModel.findOne({
        _id: item.product,
      }).populate("constituents.product");

      if (!packageExists) {
        throw new Error(`Package with ID: ${item.product} no longer exists.`);
      }

      for (const constituent of packageExists.constituents) {
        const qtyNeeded = constituent.qty * item.qty;
        if (!constituent.product || constituent.product.isDeleted) {
          throw new Error(`Component product in package ${packageExists.name} is deleted or missing.`);
        }
        if (constituent.product.quantityInStock < qtyNeeded) {
          throw new Error(`Component product ${constituent.product.name} inside package ${packageExists.name} has insufficient stock.`);
        }

        constituent.product.quantityInStock -= qtyNeeded;
        purchasedProducts.push(constituent.product);
      }

      itemsArray.push({
        itemName: packageExists.name,
        itemQty: item.qty,
        itemPrice: packageExists.price,
        discountPercentageOff: "0% OFF",
        delivery: item.deliveryFee,
      });
    }
  }

  // Save subtracted quantity of purchased products
  for (const product of purchasedProducts) {
    await product.save();
  }

  // Update order status
  order.paymentStatus = "paid";
  order.trackingStatus = "Processing";

  // 2. Generate and save tracking ID
  const trackingIdGenerator = new idGenerator();
  const trackingID = await trackingIdGenerator.generateTrackingID(
    TrackingIdModel,
    order._id,
  );

  const trackingIdDoc = await TrackingIdModel.findOne({
    tracking_id: trackingID,
  });
  order.trackingId = trackingIdDoc._id;
  await order.save();

  // 3. Send confirmation emails
  const { suiteNumber, streetAddress, city, zipCode } = order.deliveryDetails;
  const cityAndZip = `${city} ${zipCode}`;
  let totDeliveryFee = 0;
  let totCost = 0;
  let subTotalPrice = 0;
  itemsArray.forEach((itm) => {
    totDeliveryFee = totDeliveryFee + itm.delivery;
    totCost = totCost + itm.itemPrice * itm.itemQty;
  });

  subTotalPrice = totCost;
  const totCostWithDelivery = totCost + totDeliveryFee;

  const estimatedDaysForDelivery = 7;
  const estimatedDateOfDelivery = addDaysToCurrentDate(
    estimatedDaysForDelivery,
  );
  const formattedDeliveryDateEstimate = dateStringToReadableDate(
    estimatedDateOfDelivery,
  );

  let orderConfirmedEmailData = {
    from: config.EMAIL_FROM,
    to: order.user.email,
    name: order.user.firstname,
    subject: "Order Confirmed",
    template: "order-confirmed",
    trackingId: trackingID,
    items: itemsArray,
    deliveryFee: totDeliveryFee.toLocaleString("en-US", {
      style: "currency",
      currency: "NGN",
    }),
    totalCost: totCostWithDelivery.toLocaleString("en-US", {
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

  sendBrevoEmail({
    to: [{ email: order.user.email, name: order.user.firstname }],
    templateName: "order-confirmed",
    parameters: {
      SupportAgentName: "Jessy",
    },
    ...orderConfirmedEmailData,
  });

  // Admins email copy
  const admins = await UserModel.find({
    $or: [{ isAdmin: true }, { isSuperAdmin: true }],
  });

  for (const admin of admins) {
    let adminEmailData = {
      from: config.EMAIL_FROM,
      to: admin.email,
      name: admin.firstname,
      subject: "Order Received",
      template: "order-received",
      trackingId: trackingID,
      items: itemsArray,
      deliveryFee: totDeliveryFee.toLocaleString("en-US", {
        style: "currency",
        currency: "NGN",
      }),
      totalCost: totCostWithDelivery.toLocaleString("en-US", {
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

    sendBrevoEmail({
      to: [{ email: admin.email, name: admin.firstname }],
      templateName: "order-received",
      parameters: {
        SupportAgentName: "Jessy",
      },
      ...adminEmailData,
    });
  }

  return order;
};

exports.verifyOrderPayment = async (req, res, next) => {
  try {
    const { paymentReference } = req.body;
    const user = req.user;
    if (!user) {
      return next(new ErrorResponse("Please login to continue!", 401, "unauthorized"));
    }

    if (!paymentReference) {
      return next(new ErrorResponse("Payment reference is required", 400, "validationError"));
    }

    const order = await finalizeOrderPayment(paymentReference);

    return res.status(200).json({
      success: true,
      message: "Order placed and payment verified successfully",
      order,
    });
  } catch (error) {
    return next(new ErrorResponse(error.message, 400, "validationError"));
  }
};

const crypto = require("crypto");

exports.paystackWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      return res.status(400).json({ message: "No signature provided" });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || config.PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac("sha512", paystackSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const event = req.body;
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      await finalizeOrderPayment(reference);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(200).json({ success: false, error: error.message });
  }
};
