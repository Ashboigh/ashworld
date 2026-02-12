import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { verifyTOTPToken } from "@/lib/mfa";
import { compare } from "bcryptjs";
import { z } from "zod";

const disableMFASchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = disableMFASchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { code, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mfaEnabled: true, mfaSecret: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: "MFA is not enabled" },
        { status: 400 }
      );
    }

    // Verify password
    if (user.passwordHash) {
      const isPasswordValid = await compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 400 }
        );
      }
    }

    // Verify the TOTP code
    const isValid = verifyTOTPToken(code, user.mfaSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Disable MFA and remove backup codes
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaVerifiedAt: null,
        },
      }),
      prisma.mFABackupCode.deleteMany({
        where: { userId: session.user.id },
      }),
    ]);

    return NextResponse.json({
      message: "MFA disabled successfully",
    });
  } catch (error) {
    console.error("MFA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable MFA" },
      { status: 500 }
    );
  }
}
