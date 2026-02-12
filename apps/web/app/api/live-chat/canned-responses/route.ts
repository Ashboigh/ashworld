import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { z } from "zod";

const responseSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  shortcut: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.LIVE_CHAT_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const responses = await prisma.cannedResponse.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error("Canned responses GET error:", error);
    return NextResponse.json(
      { error: "Failed to load canned responses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.LIVE_CHAT_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = responseSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const response = await prisma.cannedResponse.create({
      data: {
        organizationId: orgId,
        title: parseResult.data.title,
        content: parseResult.data.content,
        shortcut: parseResult.data.shortcut || null,
        category: parseResult.data.category || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ response }, { status: 201 });
  } catch (error) {
    console.error("Canned responses POST error:", error);
    return NextResponse.json(
      { error: "Failed to save canned response" },
      { status: 500 }
    );
  }
}
