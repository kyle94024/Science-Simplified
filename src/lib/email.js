import nodemailer from "nodemailer";

export async function sendMagicLinkEmail({ tenant, email, url, subject, intro }) {
    const magicUrl = url;
    const tenantName = tenant?.name || "Simplified";
    const primary = tenant?.theme?.primary || "#4cb19f";

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
        from: `"${tenantName}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject || "Your Magic Login Link",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                ${intro ? `<p style="color:#333; font-size:15px;">${intro}</p>` : `<p style="color:#333;">Click to sign in:</p>`}
                <p style="margin: 24px 0;">
                    <a href="${magicUrl}" style="background:${primary}; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
                        Sign in to ${tenantName}
                    </a>
                </p>
                <p style="color: #888; font-size: 13px;">This link expires in 30 days.</p>
                <p style="color: #aaa; font-size: 12px; margin-top: 30px;">If you didn't expect this email, you can safely ignore it.</p>
            </div>
        `,
    });

    return true;
}

/**
 * Specialized email for researcher invites — adds clarifying intro text.
 */
export async function sendResearcherInviteEmail({ tenant, email, url, inviterName, trialCount = 0, articleCount = 0 }) {
    const tenantName = tenant?.name || "Simplified";
    const total = trialCount + articleCount;
    const subject = `You've been invited to verify content on ${tenantName}`;
    const assignmentLines = [];
    if (trialCount > 0) {
        assignmentLines.push(`<strong>${trialCount}</strong> clinical ${trialCount === 1 ? "trial" : "trials"}`);
    }
    if (articleCount > 0) {
        assignmentLines.push(`<strong>${articleCount}</strong> ${articleCount === 1 ? "article" : "articles"}`);
    }
    const assignmentSummary = assignmentLines.length > 0
        ? `<br/><br/>You have ${assignmentLines.join(" and ")} assigned for review.`
        : "";
    const intro = `
        ${inviterName ? `${inviterName} has invited you` : "You've been invited"} to ${tenantName}
        as an expert to review and verify ${total > 0 ? "the items below" : "clinical trials and articles"}.
        Click the button below to access your dashboard.
        ${assignmentSummary}
    `;
    return sendMagicLinkEmail({ tenant, email, url, subject, intro });
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