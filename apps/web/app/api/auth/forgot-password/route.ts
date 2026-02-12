import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { generateToken, getTokenExpiry } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message:
          "If an account with that email exists, we have sent a password reset link.",
      });
    }

    // Generate reset token
    const passwordResetToken = generateToken();
    const passwordResetExpires = getTokenExpiry(1); // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // Send reset email
    await sendPasswordResetEmail(normalizedEmail, passwordResetToken);

    return NextResponse.json({
      message:
        "If an account with that email exists, we have sent a password reset link.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
