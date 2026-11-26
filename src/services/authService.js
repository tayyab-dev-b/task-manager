const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const SALT_ROUNDS = 10; // same cost factor I used in my auth projects

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

/**
 * Register a new user: reject duplicate emails, hash the password
 * with bcrypt, store the user and issue a JWT.
 */
async function register({ username, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("User already exists with this email.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  return { user: publicUser(user), token: signToken(user._id) };
}

/** Log in: verify the email exists and the password matches. */
async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid credentials.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid credentials.", 401);
  }

  return { user: publicUser(user), token: signToken(user._id) };
}

/** Fetch the logged-in user's profile (password is never selected). */
async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }
  return publicUser(user);
}

module.exports = { register, login, getProfile };
