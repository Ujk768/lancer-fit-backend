import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";

import { hashPassword, verifyPassword } from "../utils/password";

import {
  createPasswordReset,
  verifyPasswordResetCode,
  completePasswordReset,
} from "../services/passwordResetService";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";

import {
  createEmailVerification,
  verifyEmailService,
} from "../services/emailVerificationService";

const formatName = (firstName?: string, lastName?: string) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const jwtDecode = (token: string): { exp: number; userId: number } => {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded !== "object" || !("exp" in decoded)) {
    throw new Error("Invalid token");
  }

  return decoded as { exp: number; userId: number };
};

const issueRefreshToken = async (userId: number) => {
  const refreshToken = generateRefreshToken(userId);
  const { exp } = jwtDecode(refreshToken);

  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(exp * 1000),
  });

  return refreshToken;
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, faculty, nationality, role } =
      req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email: normalizedEmail } });

    if (existing) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    const hashed = await hashPassword(password);

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashed,
      faculty,
      nationality,
      role,
      emailVerified: false,
    });

    try {
      await createEmailVerification(user);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    return res.status(201).json({
      message: "Account created. Please verify your email.",
      email: user.email,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error creating user",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    await verifyEmailService(email, code);

    return res.json({
      message: "Email verified successfully",
    });
  } catch (err) {
    return res.status(400).json({
      message: err instanceof Error ? err.message : "Email verification failed",
    });
  }
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    await createEmailVerification(user);

    return res.status(200).json({
      message: "Verification code sent successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to send verification code",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerified) {
      try {
        await createEmailVerification(user);
      } catch (error) {
        console.error("Failed to send verification code:", error);
      }

      return res.status(403).json({
        message: "Please verify your email before logging in",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const name = formatName(user.firstName, user.lastName);

    const accessToken = generateAccessToken(user.userId, user.role, name);

    const refreshToken = await issueRefreshToken(user.userId);

    return res.status(200).json({
      message: "Login successful",
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
        totalXp: user.totalXp,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({
      message: "Error logging in",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    await createPasswordReset(normalizedEmail);

    return res.status(200).json({
      message:
        "If an account exists for that email, a reset code has been sent.",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to create reset request",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    const result = await verifyPasswordResetCode(email, code);

    return res.json(result);
  } catch (err) {
    return res.status(400).json({
      message: err instanceof Error ? err.message : "Invalid reset code",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetTokenId, password } = req.body;

    await completePasswordReset(resetTokenId, password);

    return res.json({
      message: "Password updated successfully",
    });
  } catch (err) {
    return res.status(400).json({
      message: err instanceof Error ? err.message : "Unable to reset password",
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      message: "No refresh token",
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken) as {
      userId: number;
    };

    const record = await RefreshToken.findOne({
      where: {
        tokenHash: hashToken(refreshToken),
      },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      return res.status(401).json({
        message: "Session expired, please log in again",
      });
    }

    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const name = formatName(user.firstName, user.lastName);

    const accessToken = generateAccessToken(user.userId, user.role, name);

    return res.json({
      accessToken,
    });
  } catch {
    return res.status(401).json({
      message: "Session expired, please log in again",
    });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        message: "Refresh token required",
      });
    }

    await RefreshToken.update(
      {
        revokedAt: new Date(),
      },
      {
        where: {
          tokenHash: hashToken(refreshToken),
        },
      },
    );

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error logging out",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
