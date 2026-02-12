import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { verifyTOTPToken, verifyBackupCode } from "@/lib/mfa";
import { z } from "zod";

const verifyMFASchema = z.object({
  userId: z.string(),
  code: z.string().min(1, "Code is required"),
  isBackupCode: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = verifyMFASchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { userId, code, isBackupCode } = result.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: "MFA is not enabled for this user" },
        { status: 400 }
      );
    }

    let isValid = false;

    if (isBackupCode) {
      // Check backup codes
      const backupCodes = await prisma.mFABackupCode.findMany({
        where: {
          userId,
          usedAt: null,
        },
      });

      for (const backupCode of backupCodes) {
        const matches = await verifyBackupCode(code, backupCode.code);
        if (matches) {
          // Mark backup code as used
          await prisma.mFABackupCode.update({
            where: { id: backupCode.id },
            data: { usedAt: new Date() },
          });
          isValid = true;
          break;
        }
      }
    } else {
      // Verify TOTP code
      isValid = verifyTOTPToken(code, user.mfaSecret);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: isBackupCode ? "Invalid backup code" : "Invalid verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "MFA verification successful",
    });
  } catch (error) {
    console.error("MFA verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify MFA code" },
      { status: 500 }
    );
  }
}
