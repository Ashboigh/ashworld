import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mfaEnabled: true, mfaVerifiedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count remaining backup codes if MFA is enabled
    let remainingBackupCodes = 0;
    if (user.mfaEnabled) {
      remainingBackupCodes = await prisma.mFABackupCode.count({
        where: {
          userId: session.user.id,
          usedAt: null,
        },
      });
    }

    return NextResponse.json({
      enabled: user.mfaEnabled,
      enabledAt: user.mfaVerifiedAt,
      remainingBackupCodes,
    });
  } catch (error) {
    console.error("MFA status error:", error);
    return NextResponse.json(
      { error: "Failed to get MFA status" },
      { status: 500 }
    );
  }
}
