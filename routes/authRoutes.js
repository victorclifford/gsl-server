const express = require("express");
const {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  userVerification,
  requestUserVerification,
  refreshToken,
} = require("../controllers/AuthController");
const { authorizeUser } = require("../middlewares/authorizations");

const router = express.Router();

//SIGNUP
router.post("/signup", signupUser);

//LOGIN
router.post("/login", loginUser);

//REFRESH TOKEN
router.post("/refresh-token", refreshToken);

//forgot password
router.post("/forgotpassword", forgotPassword);

//reset password
router.put("/resetpassword/:resettoken", resetPassword);

//verify user
router.post("/verify-user/:verifytoken", userVerification);

//req verification
router.post("/request-verification/:email", requestUserVerification);

module.exports = router;
