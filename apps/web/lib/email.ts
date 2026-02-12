// Email utility - currently logs to console for development
// Replace with actual email service (Resend, SendGrid, etc.) later

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // In development, log to console
  console.log("=".repeat(50));
  console.log("EMAIL SENT (Development Mode)");
  console.log("=".repeat(50));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("-".repeat(50));
  console.log(html);
  console.log("=".repeat(50));

  // Return success for development
  return { success: true };
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to Enterprise Chatbot Platform!</h1>
      <p>Please click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
    `,
  });
}
