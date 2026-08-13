const User = require("../models/UserModel");
const Auth = require("../models/AuthModel");
const OrderModel = require("../models/OrderModel");
const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const paginate = require("../utils/paginate");
const config = require("../utils/config");
const { sendEmail } = require("../utils/sendEmail");

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q = "" } = req.query;

    const query = {
      isAdmin: { $ne: true },
      isSuperAdmin: { $ne: true }
    };

    if (q) {
      const searchRegex = new RegExp(q.trim(), "i");
      query.$or = [
        { firstname: searchRegex },
        { lastname: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex }
      ];
    }

    const { data: users, pagination } = await paginate(User, query, {
      page,
      limit,
      sort: { createdAt: -1 }
    });

    return res.status(200).json({
      success: true,
      message: "Users fetch successful",
      users,
      pagination
    });
  } catch (error) {
    return next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const { userid } = req?.params;
    const user = await User.findById(userid);

    if (!user) {
      return next(new ErrorResponse("User not found!", 404));
    }

    return res.status(200).json({
      success: true,
      message: "User fetch successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const orders = await OrderModel.find({});
    // Function to calculate total revenue
    const calculateTotalRevenue = (orders) => {
      let totalRevenue = 0;
      orders.forEach((order) => {
        totalRevenue += order.totalPricePaid;
      });
      return totalRevenue;
    };

    // Function to calculate total revenue per month
    const calculateRevenuePerMonth = (orders) => {
      const revenuePerMonth = {};
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      for (let i = currentMonth; i >= 0; i--) {
        const month = new Date(currentYear, i).toLocaleString("en-us", {
          month: "long",
        });
        revenuePerMonth[month] = 0;
      }

      orders.forEach((order) => {
        const month = new Date(order.createdAt).toLocaleString("en-us", {
          month: "long",
        });
        const revenue = order.totalPricePaid;
        revenuePerMonth[month] += revenue;
      });

      return revenuePerMonth;
    };

    // Function to calculate total number of orders per month
    const calculateOrdersPerMonth = (orders) => {
      const ordersPerMonth = {};
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      for (let i = currentMonth; i >= 0; i--) {
        const month = new Date(currentYear, i).toLocaleString("en-us", {
          month: "long",
        });
        ordersPerMonth[month] = 0;
      }

      orders.forEach((order) => {
        const month = new Date(order.createdAt).toLocaleString("en-us", {
          month: "long",
        });
        ordersPerMonth[month]++;
      });

      return ordersPerMonth;
    };

    // Generate statistics report
    const generateStatisticsReport = (orders) => {
      const statisticsReport = {
        totalOrders: orders?.length,
        totalRevenue: calculateTotalRevenue(orders),
        revenuePerMonth: calculateRevenuePerMonth(orders),
        ordersPerMonth: calculateOrdersPerMonth(orders),
        // Add more statistics as needed
      };
      return statisticsReport;
    };

    const dashboardStats = generateStatisticsReport(orders);
    return res.status(200).json({
      success: true,
      message: "Dashboard stats fetch successful",
      dashboardStats,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAdminUsers = async (req, res, next) => {
  try {
    const admins = await User.find({
      $or: [{ isAdmin: true }, { isSuperAdmin: true }],
    }).select("-password");

    return res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { userid } = req.params;
    const { isAdmin, isSuperAdmin } = req.body;

    const user = await User.findById(userid);
    if (!user) {
      return next(new ErrorResponse("User not found!", 404));
    }

    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    if (isSuperAdmin !== undefined) user.isSuperAdmin = isSuperAdmin;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User privileges updated successfully",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

exports.createAccount = async (req, res, next) => {
  try {
    const { firstname, lastname, email, phoneNumber, password, role, roleTitle } = req.body;

    if (!firstname || !lastname || !email || !phoneNumber || !password || !role) {
      return next(new ErrorResponse("All fields are required", 400));
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const userExist = await User.findOne({ email: cleanEmail });
    if (userExist) {
      return next(new ErrorResponse("This email is already in use!", 400));
    }

    const isAdmin = role === "admin" || role === "superAdmin";
    const isSuperAdmin = role === "superAdmin";

    // Create User document
    const user = await User.create({
      firstname,
      lastname,
      email: cleanEmail,
      phoneNumber,
      isAdmin,
      isSuperAdmin,
      roleTitle: roleTitle || (isSuperAdmin ? "Super Admin" : isAdmin ? "Store Admin" : ""),
      is_verified: true, // Manually created accounts are pre-verified
    });

    // Create Auth document
    const auth = new Auth({
      userId: user._id,
      password,
    });
    await auth.save();

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    return next(error);
  }
};
