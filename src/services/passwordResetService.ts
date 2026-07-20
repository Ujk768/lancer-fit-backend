import crypto from "crypto";

import { User } from "../models/User";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { hashPassword } from "../utils/password";
import { generateOtp } from "../utils/otp";
import { sendPasswordResetEmail } from "./emailService";
import { RefreshToken } from "../models/RefreshToken";

const OTP_EXPIRY = 7 * 60 * 1000; // 7 minutes in milliseconds

const hashCode = (code: string) =>
  crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");


export async function createPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    where: {
      email: normalizedEmail,
    },
  });

  // Do not reveal whether account exists
  if (!user) {
    return;
  }

  const code = generateOtp();

  await PasswordResetToken.create({
    userId: user.userId,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRY),
  });

  await sendPasswordResetEmail(
    user.email,
    code,
  );
}


export async function verifyPasswordResetCode(
  email: string,
  code: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new Error("Invalid verification code");
  }


  const token = await PasswordResetToken.findOne({
    where: {
      userId: user.userId,
      usedAt: null,
    },
    order: [
      ["createdAt", "DESC"],
    ],
  });


  if (
    !token ||
    token.expiresAt < new Date() ||
    token.codeHash !== hashCode(code)
  ) {
    throw new Error(
      "Invalid or expired reset code",
    );
  }


  return {
    resetTokenId: token.id,
  };
}


export async function completePasswordReset(
  resetTokenId:number,
  password:string,
) {

  const token =
    await PasswordResetToken.findByPk(
      resetTokenId,
    );


  if(
    !token ||
    token.usedAt ||
    token.expiresAt < new Date()
  ){
    throw new Error(
      "Invalid or expired reset request",
    );
  }


  const user =
    await User.findByPk(token.userId);


  if(!user){
    throw new Error(
      "User not found",
    );
  }


  user.password =
    await hashPassword(password);

  await user.save();


  token.usedAt = new Date();

  await token.save();


  await RefreshToken.update(
    {
      revokedAt:new Date(),
    },
    {
      where:{
        userId:user.userId,
        revokedAt:null,
      },
    },
  );
}