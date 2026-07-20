import { emailLayout } from "./emailLayout";

export function passwordResetEmailTemplate(code: string) {
  return emailLayout(
    "Reset Your Password",
    `
      <p
        style="
          color:#A8BBD4;
          line-height:1.7;
          margin:0;
        "
      >
        We received a request to reset your LancerFit
        password.
      </p>

      <p
        style="
          color:#A8BBD4;
          line-height:1.7;
          margin-top:16px;
        "
      >
        Use the verification code below to reset your password:
      </p>

      <div
        style="
          margin:28px 0;
          padding:24px;
          text-align:center;
          background:rgba(47,123,196,0.18);
          border:1px solid rgba(74,147,216,0.34);
          border-radius:16px;
        "
      >
        <div
          style="
            font-size:34px;
            font-weight:bold;
            letter-spacing:10px;
            color:#EEF3FA;
          "
        >
          ${code}
        </div>
      </div>
    
      <p
        style="
          margin:0;
          color:#FFD157;
          font-weight:bold;
        "
      >
        This code expires in 7 minutes.
      </p>

      <p
        style="
          margin-top:20px;
          color:#A8BBD4;
          line-height:1.7;
        "
      >
        If you didn't request a password reset,
        you can safely ignore this email.
      </p>
    `,
  );
}
