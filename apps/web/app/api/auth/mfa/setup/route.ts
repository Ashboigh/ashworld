import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { generateMFASetupPayload } from "@/lib/mfa";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, mfaEnabled: true },
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

    // Generate MFA setup payload
    const setupPayload = await generateMFASetupPayload(user.email);

    // Store the secret temporarily (will be confirmed when user verifies)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { mfaSecret: setupPayload.secret },
    });

    return NextResponse.json({
      qrCodeDataUrl: setupPayload.qrCodeDataUrl,
      secret: setupPayload.secret, // For manual entry
    });
  } catch (error) {
    console.error("MFA setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate MFA setup" },
      { status: 500 }
    );
  }
}
