const yup = require("yup");
const mongoose = require("mongoose");

exports.signupValidationSchema = yup.object().shape({
  firstName: yup
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name cannot exceed 50 characters")
    .required("First name is required"),
  lastName: yup
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name cannot exceed 50 characters")
    .required("Last name is required"),
  email: yup
    .string()
    .trim()
    .email("Please provide a valid email address")
    .required("Email is required"),
  phoneNumber: yup
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(30, "Password cannot exceed 30 characters")
    .required("Password is required"),
});

//category schema validation
exports.categoryValidationSchema = yup.object().shape({
  name: yup.string().required().min(3).max(30),
  description: yup.string().required().min(5).max(300),
});

//url validation schema
exports.urlValidator = yup.object().shape({
  url: yup.string().required().url(),
});

exports.validateDate = yup.object().shape({
  inspectionDate: yup
    .date()
    .typeError("Invalid date format. provide date format in: YYYY-MM-DD")
    .min(
      new Date(Date.now()),
      "Date cannot be later than the current date" + new Date(Date.now()),
    )
    .required("Date is required."),
});

exports.validatePhoneNumber = yup.object().shape({
  phoneNumber: yup.string().min(10).max(15).required(),
});

exports.validateArrayOfStrings = function validateStringArray(
  arrOfStrings,
  min,
  max,
  field,
) {
  // check if arr is an array
  if (!Array.isArray(arrOfStrings)) {
    return {
      valid: false,
      cause: `the field '${field}' must be an array!`,
    };
  }
  const validString = arrOfStrings.every(
    (elem) =>
      typeof elem === "string" && elem.length <= max && elem.length >= min,
  );
  if (validString) {
    return {
      valid: true,
    };
  }
  return {
    valid: false,
    cause: `all ${field} must have a minimum of ${min} characters, and maximum of ${max} characters each!`,
  };
};

exports.addProductSchema = yup.object().shape({
  name: yup.string().required().min(3).max(80),
  description: yup.string().required().min(5).max(650),
  price: yup.number().required().min(1).max(1000000000),
  discountPrice: yup.number().nullable().min(0).max(1000000000),
  quantityInStock: yup.number().nullable().min(0).max(1000000),
  withinLocationDeliveryFee: yup.number().nullable().min(0).max(100000000),
  outsideLocationDeliveryFee: yup.number().nullable().min(0).max(100000000),
});

exports.createBlogValidationSchema = yup.object().shape({
  title: yup.string().required().min(3).max(120),
  author: yup.string().required().min(3).max(100),
});

exports.addOrderSchema = yup.object().shape({
  paymentMethod: yup.string().required().min(3).max(80),
  paymentReference: yup.string().required().min(3).max(80),
  totalPricePaid: yup.number().required().min(50).max(100000000),
});
