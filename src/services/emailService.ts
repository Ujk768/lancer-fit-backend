import nodemailer from "nodemailer";

import { verificationEmailTemplate } from "./emailTemplates/verificationEmail";
import { passwordResetEmailTemplate } from "./emailTemplates/passwordResetEmail";

const transporter = nodemailer.createTransport({
  host: process.env.SANDBOX_EMAIL_HOST,
  port: Number(process.env.SANDBOX_EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.SANDBOX_EMAIL_USER,
    pass: process.env.SANDBOX_EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(
  email: string,
  code: string,
) {
  await transporter.sendMail({
    from: `"LancerFit" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your LancerFit account",
    html: verificationEmailTemplate(code),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  code: string,
) {

  await transporter.sendMail({
    from: `"LancerFit" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your LancerFit password",
    html: passwordResetEmailTemplate(code),
  });
}