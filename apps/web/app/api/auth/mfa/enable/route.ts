import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { verifyTOTPToken, generateBackupCodesWithHashes } from "@/lib/mfa";
import { z } from "zod";

const enableMFASchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = enableMFASchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { code } = result.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA is already enabled" },
        { status: 400 }
      );
    }

    if (!user.mfaSecret) {
      return NextResponse.json(
        { error: "Please start MFA setup first" },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTPToken(code, user.mfaSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Generate backup codes
    const { codes, hashedCodes } = await generateBackupCodesWithHashes();

    // Enable MFA and store backup codes
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          mfaEnabled: true,
          mfaVerifiedAt: new Date(),
        },
      }),
      prisma.mFABackupCode.createMany({
        data: hashedCodes.map((code) => ({
          userId: session.user.id,
          code,
        })),
      }),
    ]);

    return NextResponse.json({
      message: "MFA enabled successfully",
      backupCodes: codes, // Show once to user
    });
  } catch (error) {
    console.error("MFA enable error:", error);
    return NextResponse.json(
      { error: "Failed to enable MFA" },
      { status: 500 }
    );
  }
}
