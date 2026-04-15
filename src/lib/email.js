import nodemailer from "nodemailer";

export async function sendMagicLinkEmail({ tenant, email, url }) {
    const magicUrl = url; // EXACT URL passed from create route

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Simplified Login" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Magic Login Link",
        html: `
            <p>Click to sign in:</p>
            <a href="${magicUrl}" style="color: #4cb19f; font-size: 18px;">
                Login to your account
            </a>
            <p>This link expires in 30 days.</p>
        `,
    });

    return true;
}
export async function sendResetPasswordEmail({ email, resetLink }) {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Simplified Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset Your Password",
        html: `
<div style="font-family: Arial, sans-serif; background:#f5f5f5; padding:40px 0;">
  <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; padding:30px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.05);">
    
    <h2 style="margin-bottom:10px;">Reset your password</h2>
    
    <p style="color:#555; font-size:14px; margin-bottom:25px;">
      We received a request to reset your password.
    </p>

    <a href="${resetLink}" 
       style="display:inline-block; padding:14px 24px; background:#111; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">
      Reset Password
    </a>

    <p style="color:#777; font-size:12px; margin-top:25px;">
      This link will expire in 30 minutes.
    </p>

    <div style="margin-top:30px; border-top:1px solid #eee; padding-top:20px;">
      <p style="font-size:12px; color:#aaa;">
        If you didn’t request this, you can safely ignore this email.
      </p>
    </div>

  </div>

  <p style="text-align:center; font-size:12px; color:#aaa; margin-top:20px;">
    © ${new Date().getFullYear()} NF Simplified
  </p>
</div>
`,
    });

    return true;
}