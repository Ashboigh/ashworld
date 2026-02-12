import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { verifyTOTPToken, generateBackupCodesWithHashes } from "@/lib/mfa";
import { z } from "zod";

const regenerateBackupCodesSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

// GET - Get status of backup codes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mfaEnabled: true },
    });

    if (!user?.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA is not enabled" },
        { status: 400 }
      );
    }

    // Count remaining unused backup codes
    const remainingCodes = await prisma.mFABackupCode.count({
      where: {
        userId: session.user.id,
        usedAt: null,
      },
    });

    return NextResponse.json({
      remainingCodes,
    });
  } catch (error) {
    console.error("Backup codes status error:", error);
    return NextResponse.json(
      { error: "Failed to get backup codes status" },
      { status: 500 }
    );
  }
}

// POST - Regenerate backup codes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = regenerateBackupCodesSchema.safeParse(body);

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

    if (!user?.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: "MFA is not enabled" },
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

    // Generate new backup codes
    const { codes, hashedCodes } = await generateBackupCodesWithHashes();

    // Delete old codes and create new ones
    await prisma.$transaction([
      prisma.mFABackupCode.deleteMany({
        where: { userId: session.user.id },
      }),
      prisma.mFABackupCode.createMany({
        data: hashedCodes.map((code) => ({
          userId: session.user.id,
          code,
        })),
      }),
    ]);

    return NextResponse.json({
      message: "Backup codes regenerated successfully",
      backupCodes: codes,
    });
  } catch (error) {
    console.error("Backup codes regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}
