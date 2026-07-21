import { z } from "zod";
import { Faculty } from "../models/User";

const facultyValues = Object.values(Faculty) as [Faculty, ...Faculty[]];

const uwindsorEmail = z
  .string()
  .trim()
  .email("Invalid email format")
  .refine((email) => email.toLowerCase().endsWith("@uwindsor.ca"), {
    message: "Only University of Windsor emails are allowed",
  });

export const signupSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters"),

  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),

  email: uwindsorEmail,

  password: z.string().min(8, "Password must be at least 8 characters"),

  faculty: z
    .string()
    .trim()
    .refine((value) => facultyValues.includes(value as Faculty), {
      message: "Select a valid faculty",
    }),

  nationality: z
    .string()
    .trim()
    .regex(/^[a-z]{2}$/i, "Nationality must use a 2-letter code"),

  role: z.enum(["admin", "student"]).default("student"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().length(6),
});

export const resetPasswordSchema = z
  .object({
    resetTokenId: z.number(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

// Infer TypeScript types directly from the schema — no duplication
export type SignupBody = z.infer<typeof signupSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type VerifyResetCodeBody = z.infer<typeof verifyResetCodeSchema>;
