import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { createWorkspaceSchema } from "@/lib/validations/organization";
import {
  getOrganizationMemberRole,
  generateUniqueSlug,
  createAuditLog,
  getOrganizationWorkspaces,
} from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { checkOrganizationLimit } from "@/lib/billing";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/organizations/[orgId]/workspaces - List workspaces
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role) {
      return NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 404 }
      );
    }

    const workspaces = await getOrganizationWorkspaces(orgId, session.user.id);

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[orgId]/workspaces - Create workspace
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getOrganizationMemberRole(orgId, session.user.id);

    if (!role || !hasPermission(role, Permission.WORKSPACE_CREATE)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Check workspace limit
    const limitCheck = await checkOrganizationLimit(orgId, "workspaces");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Workspace limit reached",
          code: "LIMIT_EXCEEDED",
          details: {
            resource: "workspaces",
            current: limitCheck.currentUsage,
            limit: limitCheck.limit,
            message: limitCheck.upgradeMessage,
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createWorkspaceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, description, slug: providedSlug } = result.data;

    // Generate or validate slug
    const slug =
      providedSlug ||
      (await generateUniqueSlug(name, "workspace", orgId));

    // Check if slug already exists in this organization
    const existingWorkspace = await prisma.workspace.findFirst({
      where: { organizationId: orgId, slug },
    });

    if (existingWorkspace) {
      return NextResponse.json(
        { error: "A workspace with this slug already exists" },
        { status: 409 }
      );
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        organizationId: orgId,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "workspace.created",
      resourceType: "workspace",
      resourceId: workspace.id,
      newValues: { name, slug, description },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
