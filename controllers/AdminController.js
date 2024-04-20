const User = require("../models/UserModel");
const OrderModel = require("../models/OrderModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { sendEmail } = require("../utils/sendEmail");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({});

    return res.status(200).json({
      success: true,
      message: "Users fetch successful",
      users,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const { userid } = req?.params;
    const user = await User.findById(userid);

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
