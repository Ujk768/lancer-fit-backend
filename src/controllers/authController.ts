import { Request, Response } from "express";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { User } from "../models/User";

type ResetTokenRecord = {
  userId: number;
  expiresAt: number;
};

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const passwordResetTokens = new Map<string, ResetTokenRecord>();

const formatName = (firstName?: string, lastName?: string) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, faculty, nationality, role } =
      req.body;
    const name = formatName(firstName, lastName);

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashed = await hashPassword(password);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      faculty,
      nationality,
      role,
    });

    const accessToken = generateAccessToken(user.userId, user.role);
    const refreshToken = generateRefreshToken(user.userId);

    res.status(201).json({
      message: "User created successfully",
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        name,
        email: user.email,
        faculty: user.faculty,
        nationality: user.nationality,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating user", error: err });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate both tokens
    const accessToken = generateAccessToken(user.userId, user.role);
    const refreshToken = generateRefreshToken(user.userId);

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        name: formatName(user.firstName, user.lastName),
        email: user.email,
        faculty: user.faculty,
        nationality: user.nationality,
        role: user.role,
        // never include password here
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in", error: err });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (user) {
      const token = crypto.randomUUID();
      passwordResetTokens.set(token, {
        userId: user.userId,
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
      });

      const payload: Record<string, unknown> = {
        message:
          "If an account exists for that email, a password reset link has been sent.",
      };

      if (process.env.NODE_ENV === "development") {
        payload.resetToken = token;
      }

      return res.status(200).json(payload);
    }

    return res.status(200).json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating password reset request", error: err });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const record = passwordResetTokens.get(token);

    if (!record || record.expiresAt < Date.now()) {
      passwordResetTokens.delete(token);
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    const user = await User.findByPk(record.userId);
    if (!user) {
      passwordResetTokens.delete(token);
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await hashPassword(password);
    await user.save();
    passwordResetTokens.delete(token);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password", error: err });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = verifyRefreshToken(refreshToken) as { userId: number };

    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const newAccessToken = generateAccessToken(user.userId, user.role);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    // refresh token expired or invalid → user must log in again
    res.status(401).json({ message: "Session expired, please log in again" });
  }
};

export const logout = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
