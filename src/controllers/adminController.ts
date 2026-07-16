// src/controllers/adminController.ts
import { Request, Response } from "express";
import { Admin, AdminRole } from "../models/Admin";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeAdmin } from "../utils/serializers";

const UWINDSOR_EMAIL = /^[^@\s]+@uwindsor\.ca$/i;

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const admin = await Admin.findOne({ where: { email: email.trim().toLowerCase() } });
  if (!admin || !(await verifyPassword(password, admin.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const accessToken = generateAccessToken(admin.adminId, "admin", admin.name);
  const refreshToken = generateRefreshToken(admin.adminId);
  res.status(200).json({
    message: "Login successful", accessToken, refreshToken, admin: serializeAdmin(admin),
  });
});

export const listAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await Admin.findAll({ order: [["createdAt", "ASC"]] });
  res.status(200).json({ success: true, admins: admins.map(serializeAdmin) });
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, role, password } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Admin name is required." });
  if (!UWINDSOR_EMAIL.test(email || "")) {
    return res.status(400).json({ message: "Admin email must be a uwindsor.ca address." });
  }
  if ((password || "").length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }
  const exists = await Admin.findOne({ where: { email: email.trim().toLowerCase() } });
  if (exists) return res.status(409).json({ message: "An admin with that email already exists." });
  const admin = await Admin.create({
    name: name.trim(), email: email.trim().toLowerCase(),
    role: role || AdminRole.TLC_STAFF, password: await hashPassword(password),
  });
  res.status(201).json({ success: true, admin: serializeAdmin(admin) });
});

export const removeAdmin = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (id === req.user!.userId) {
    return res.status(400).json({ message: "You cannot remove the account you are signed in with." });
  }
  const deleted = await Admin.destroy({ where: { adminId: id } });
  if (!deleted) return res.status(404).json({ message: "That admin account no longer exists." });
  res.status(200).json({ success: true });
});