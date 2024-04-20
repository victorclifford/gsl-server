const ErrorResponse = require("../utils/errorResponse");

const errorHandler = (err, req, res, next) => {
  let error = {
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : "Hidden in production",
    // stack: err.stack,
    message: err.message || "Internal server error",
    statusCode: err.statusCode || 500,
    name: err.name || "Error",
    success: false,
  };

  console.log(err);

  // if (err.name === "MulterError" && err.message === "Unexpected field") {
  //   error.cause =
  //     "You have exceeded the limit for number of files to be uploaded for each property.";
  //   error.solution = "Remove some files and try again";
  // }
  res.status(error.statusCode || 500).json(error);
};

module.exports = errorHandler;
