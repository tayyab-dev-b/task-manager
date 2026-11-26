const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");

/** POST /api/auth/register */
const registerUser = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    user,
    token,
  });
});

/** POST /api/auth/login */
const loginUser = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.status(200).json({
    success: true,
    message: "User logged in successfully.",
    user,
    token,
  });
});

/** GET /api/auth/profile — protected */
const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.status(200).json({
    success: true,
    message: "User profile fetched successfully.",
    user,
  });
});

module.exports = { registerUser, loginUser, getProfile };
