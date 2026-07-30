import crypto from "crypto";

import { User } from "../models/User";
import { EmailVerificationToken } from "../models/EmailVerificationToken";
import { generateOtp } from "../utils/otp";
import { sendVerificationEmail } from "./emailService";

const OTP_EXPIRY = 7 * 60 * 1000;

const hashCode = (code:string) =>
  crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");


export async function createEmailVerification(user: User) {
  const code = generateOtp();

  await EmailVerificationToken.create({
    userId:user.userId,
    codeHash:hashCode(code),
    expiresAt:new Date(Date.now()+OTP_EXPIRY),
  });

  await sendVerificationEmail(
    user.email,
    code
  );
}


export async function verifyEmailService(
 email:string,
 code:string
) {

 const user = await User.findOne({
  where:{
    email:email.trim().toLowerCase()
  }
 });

 if(!user){
  throw new Error("User not found");
 }

 if(user.emailVerified){
  throw new Error("Email already verified");
 }


 const token =
 await EmailVerificationToken.findOne({
  where:{
   userId:user.userId,
   usedAt:null
  },
  order:[
   ["createdAt","DESC"]
  ]
 });


 if(
  !token ||
  token.expiresAt < new Date() ||
  token.codeHash !== hashCode(code)
 ){
  throw new Error(
   "Invalid or expired verification code"
  );
 }


 user.emailVerified=true;

 await user.save();


 token.usedAt=new Date();

 await token.save();


 return user;
}