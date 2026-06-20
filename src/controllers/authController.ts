import { Request, Response } from "express";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { User } from "../models/User";


export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashed = await hashPassword(password);
    const user = await User.create({ name, email, password: hashed });

    const accessToken = generateAccessToken(user.userId, user.role);
    const refreshToken = generateRefreshToken(user.userId);

    res.status(201).json({
      message: 'User created successfully',
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err });
  }
};


export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate both tokens
    const accessToken = generateAccessToken(user.userId, user.role);
    const refreshToken = generateRefreshToken(user.userId);

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        // never include password here
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

  try {
    const decoded = verifyRefreshToken(refreshToken) as { userId: number };

    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const newAccessToken = generateAccessToken(user.userId, user.role);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    // refresh token expired or invalid → user must log in again
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
};