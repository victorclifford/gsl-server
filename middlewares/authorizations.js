const config = require("../utils/config");
const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/UserModel");

//*-------------  USER ONLY AUTHORIZATION  ---------------
exports.authorizeUser = async (req, res, next) => {
  let token;
  try {
    //checking headers for jwt token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // disallowing access if no token

    if (!token) {
      return next(
        new ErrorResponse("Unauthorized!! Please login to continue", 401)
      );
    }
  } catch (error) {
    next(error);
  }

  //if token is present , verify token
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    //find user by the id gotten from the decoded token
    const user = await User.findById(decoded.id);
    //if no user is found by the id on the decoded token, then token is invalid
    if (!user) {
      return next(
        new ErrorResponse("invalid auth token! Please login to continue", 404)
      );
    }
    //if user was found, then add new authorized user to the req.user
    req.user = user;
    next();
  } catch (error) {
    return next(
      new ErrorResponse("Unauthorized!! Please login to continue", 401)
    );
  }
};
//*----------------------------------------------------------//

//?-------------  ADMIN ONLY AUTHORIZATION  ---------------//

exports.authorizeAdmin = async (req, res, next) => {
  let token;
  try {
    //checking headers for jwt token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // disallowing access if no token
    if (!token) {
      return next(
        new ErrorResponse("Unauthorized! Please login to continue", 401)
      );
    }
  } catch (error) {
    next(error);
  }

  //if token is present , verify token
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    //find user by the id gotten from the decoded token
    const user = await User.findById(decoded.id);

    //if no user is found by the id on the decoded token, then token is invalid
    if (!user) {
      return next(
        new ErrorResponse("invalid auth token! Please login to continue", 404)
      );
    }
    //check if user is a super Admin

    if (user?.isAdmin || user?.isSuperAdmin) {
      //if user was found, and is admin, then add new authorized user to the req.user
      req.user = user;
      next();
    } else {
      return next(
        new ErrorResponse(
          "Only admins and super admins can perform this Operation!",
          401
        )
      );
    }
  } catch (error) {
    console.log("err-verifyingToken::", error);
    return next(
      new ErrorResponse("Unauthorized!! Please login to continue", 401)
    );
  }
};

//?------------- SUPER ADMIN ONLY AUTHORIZATION  ---------------//

exports.authorizeSuperAdmin = async (req, res, next) => {
  let token;
  try {
    //checking headers for jwt token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // disallowing access if no token

    if (!token) {
      return next(
        new ErrorResponse("Unauthorized!! Please login to continue", 401)
      );
    }
  } catch (error) {
    next(error);
  }

  //if token is present , verify token
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    //find user by the id gotten from the decoded token
    const user = await User.findById(decoded.id);
    //if no user is found by the id on the decoded token, then token is invalid
    if (!user) {
      return next(
        new ErrorResponse("invalid auth token! Please login to continue", 404)
      );
    }
    //check if user is an Admin

    if (!user?.isSuperAdmin) {
      return next(
        new ErrorResponse("Only super admins can perform this Operation!", 401)
      );
    }

    //if user was found, and is admin, then add new authorized user to the req.user
    req.user = user;
    next();
  } catch (error) {
    return next(
      new ErrorResponse("Unauthorized!! Please login to continue", 401)
    );
  }
};
