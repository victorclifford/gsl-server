const crypto = require("crypto");
const User = require("../models/UserModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { sendEmail } = require("../utils/sendEmail");
const sendMail2 = require("../utils/sendEmail2");
const { signupValidationSchema } = require("../utils/validationSchemas");
const jwt = require("jsonwebtoken");
const {
  slugify,
  firstLetterInStringToUppercase,
} = require("../utils/helpers.js");

const sendToken = async (user, statusCode, message, res) => {
  await user.getSignedToken();
  await user.save();

  if (user?.password) {
    const { password: _, ...userInfo } = user.toObject();

    return res
      .status(statusCode)
      .json({ success: true, message, data: { user: userInfo } });
  }

  return res
    .status(statusCode)
    .json({ success: true, message, data: { user } });
};

const getUserFromToken = async (token) => {
  try {
    if (token) {
      const userId = jwt.verify(token, process.env.JWT_SECRET);
      //  const user = await User.findById(userId)
      //  return user
      return userId;
    }
    return null;
  } catch (error) {
    console.log("errVerifyingToken::", error);
    return null;
  }
};

//signup user controller func
const signupUser = async (req, res, next) => {
  try {
    await signupValidationSchema.validate(req.body, { abortEarly: true });
  } catch (e) {
    e.statusCode = 400;
    return next(e);
  }
  try {
    const { fullname, phonenumber, email, password } = req.body;
    const userExist = await User.findOne({ email });
    if (userExist) {
      return next(
        new ErrorResponse("this email is already in use!", 400, "duplicateKeys")
      );
    }

    //name validations
    if (!fullname.includes(" ")) {
      return next(new ErrorResponse("Invalid fullname", 400));
    }

    // extract names and create slug
    let nameList = fullname.split(" "); // split the string by empty spaces
    let firstname = nameList.shift(); // get the first element of the array as first name
    let lastname = nameList.join(" "); // second as lastname

    if (firstname?.length < 3) {
      return next(new ErrorResponse("Your firstname is too short.", 400));
    }
    if (firstname?.length > 15) {
      return next(new ErrorResponse("Your firstname is too long.", 400));
    }

    if (lastname?.length < 3) {
      return next(new ErrorResponse("Your lastname is too short.", 400));
    }
    if (firstname?.length > 16) {
      return next(new ErrorResponse("Your lastname is too long.", 400));
    }

    //slugify
    const slug = slugify(fullname);
    const user = await User.create({
      firstname: firstLetterInStringToUppercase(firstname),
      lastname: firstLetterInStringToUppercase(lastname),
      phoneNumber: phonenumber,
      email,
      password,
      slug,
    });
    // const { password: _, ...userInfo } = user.toObject();

    //get verification token
    const verificationToken = await user.getVerificationToken();
    console.log("verificationToken-onController::", verificationToken);
    // const verificationCode = await user.getVerificationCode();
    await user.save();
    const tokenWithId = `${verificationToken}${user._id}`;
    // const host = `${req.protocol}://${req.get("host")}`;
    const host = config.HOMEPAGE;
    const verificationUrl = `${host}/account/verify/${tokenWithId}`;

    // *send email for user to verify account before being able to login
    sendEmail({
      from: config.EMAIL_FROM,
      to: user.email,
      name: user.firstname,
      subject: "Activate Your Go Solar Account",
      verificationUrl,
      template: "welcome",
      // text: message,
    });
    // sendMail2({
    //   from: config.EMAIL_FROM,
    //   to: user.email,
    //   name: user.firstname.toUpperCase(),
    //   subject: "Activate Your QuickRenta Account",
    //   verificationCode,
    //   template: "welcome.handlebars",
    //   // text: message,
    // });

    //return response
    // return res.status(201).json({
    //   success: true,
    //   message:
    //     "Registration successful. please check your inbox for a verification code, and verify your account",
    //   user: userInfo,
    // });

    sendToken(
      user,
      200,
      "Registration successful. please check your inbox for a verification code, and verify your account",
      res
    );
  } catch (error) {
    return next(error);
  }
};

//----------------LOGIN USER ----------------
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  console.log("args::", { ...req.body });

  if (!email || !password) {
    return next(
      new ErrorResponse("please provide an EMAIL and PASSWORD!", 400)
    );
  }
  try {
    //getting user by email entered for login
    const user = await User.findOne({ email }).select("+password");
    //check if any user by such email exists
    if (!user) {
      return next(new ErrorResponse("invalid EMAIL or PASSWORD!", 404));
    }
    //if user exist, then match encrypted password
    const isMatch = await user.matchPasswords(password);
    if (!isMatch) {
      return next(
        new ErrorResponse("invalid EMAIL or PASSWORD!", 401, "Validation Error")
      );
    }
    //if passwords where matched correctly then send token and login user
    sendToken(user, 200, "Authentication Successful", res);
  } catch (error) {
    return next(error);
  }
};

//--------FORGOT PASSWORD ---------------------
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    //checking if email actually exists
    if (!user) {
      return next(new ErrorResponse("Email not registered!", 404));
    }
    const resetToken = await user.getResetToken();

    await user.save();

    //create reset link
    // const host = `${req.protocol}://${req.get("host")}`;
    const host = config.HOMEPAGE;
    const resetURL = `${host}/account/reset-password/${resetToken}`;
    console.log(`sending reset password email to ${email}...`);

    try {
      sendEmail({
        from: config.EMAIL_FROM,
        to: user.email,
        name: user.firstname,
        subject: "Forgot Your Password?",
        resetURL,
        template: "forget-password",
      });

      //   sendMail2({
      //     from: config.EMAIL_FROM,
      //     to: user.email,
      //     name: user.firstname.toUpperCase(),
      //     subject: "Forgot Your Password?",
      //     resetURL,
      //     template: "forgot-password.handlebars",
      //   });
    } catch (e) {
      user.resetPasswordExpiration = undefined;
      user.resetPasswordToken = undefined;
      // console.log("email sent is:", message);
      await user.save();

      // return next(new ErrorResponse("failed to send email!", 500));
      return next(new ErrorResponse("Failed to send mail", 500));
    }

    return res
      .status(200)
      .json({ success: true, data: "Email sent! Please check your inbox" });
  } catch (error) {
    return next(error);
  }
};

const requestUserVerification = async (req, res, next) => {
  try {
    const token = req.get("Authorization");
    // console.log({ token });

    const decryptedUser = await getUserFromToken(token.split(" ")[1]);

    if (!decryptedUser) {
      return next(new ErrorResponse("Please login to continue", 400));
    }

    const user = await User.findById(decryptedUser.id);

    const verificationToken = await user.getVerificationToken();
    console.log({ verificationToken });
    await user.save();

    const tokenWithId = `${verificationToken}${user._id}`;
    // const host = `${req.protocol}://${req.get("host")}`;
    const host = config.HOMEPAGE;
    const verificationUrl = `${host}/account/verify/${tokenWithId}`;

    sendEmail({
      from: config.EMAIL_FROM,
      to: user.email,
      name: user.firstname,
      subject: "Activate Your Go Solar Account",
      verificationUrl,
      template: "welcome",
    });

    const message = `A verification link has been sent to ${user.email}`;

    return res.status(200).json({
      success: true,
      message,
      //  data: { user },
    });
  } catch (error) {
    return next(error);
  }
};

const userVerification = async (req, res, next) => {
  try {
    const { verifytoken } = req.params;

    const verifyToken = verifytoken.slice(0, -24);
    const userId = verifytoken.slice(-24);

    // const token = req.get("Authorization");

    // const decryptedUser = await getUserFromToken(token.split(" ")[1]);

    // if (!decryptedUser) {
    //   return next(new ErrorResponse("Please login to continue", 400));
    // }

    // const hashCode = crypto
    //   .createHmac("sha256", process.env.HASH_SALT)
    //   .update(verifytoken)
    //   .digest("hex");

    //find user to verify
    const user = await User.findOne({
      verification_token: verifyToken,
      verificationExpiry: { $gt: Date.now() },
      _id: userId,
    });

    if (!user) {
      return next(
        new ErrorResponse("Invalid or expired verification code", 401)
      );
    }

    //verify user if user was found
    user.is_verified = true;
    user.verificationExpiry = undefined;
    user.verification_token = undefined;
    await user.save();

    const message = "Verification successful";
    return res.status(200).json({
      success: true,
      message,
      data: { user },
    });
    // sendToken(user, 200, message, res);
  } catch (error) {
    return next(error);
  }
};

//--------------------reset password --------------
const resetPassword = async (req, res, next) => {
  console.log({ resettoken: req.params.resettoken });
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("invalid Reset Token!", 400));
    }

    //validate password
    if (!req.body.password) {
      return next(
        new ErrorResponse(
          "Please provide your new password",
          400,
          "validationError"
        )
      );
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiration = undefined;
    user.token = "";

    await user.save();

    //send mail
    sendEmail({
      from: config.EMAIL_FROM,
      to: user.email,
      name: user.firstname,
      subject: "Password Reset Successful",
      template: "password-reset-success",
    });

    return res.status(201).json({
      success: true,
      message: "Password Reset Successful",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  userVerification,
  requestUserVerification,
};
