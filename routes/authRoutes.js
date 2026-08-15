const express = require("express");
const {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  userVerification,
  requestUserVerification,
  refreshToken,
  logoutUser,
  updateUserProfile,
  changePassword,
} = require("../controllers/AuthController");
const { authorizeUser } = require("../middlewares/authorizations");

const router = express.Router();

//SIGNUP
router.post("/signup", signupUser);

//LOGIN
router.post("/login", loginUser);

//LOGOUT
router.post("/logout", logoutUser);

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

//update profile details
router.put("/update-profile", authorizeUser, updateUserProfile);

//change password
router.put("/change-password", authorizeUser, changePassword);

module.exports = router;
