/**
 * SCIM 2.0 Groups Endpoint
 * Handles list and create operations for groups
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import {
  listGroups,
  createGroup,
  verifySCIMToken,
} from "@/lib/scim/provisioning";
import { SCIM_SCHEMAS, CreateSCIMGroupRequest, SCIMError } from "@/lib/scim/types";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

const SCIM_HEADERS = {
  "Content-Type": "application/scim+json",
};

async function authorize(
  request: NextRequest,
  orgId: string
): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7);
  return verifySCIMToken(orgId, token);
}

/**
 * GET - List Groups
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter") || undefined;
  const startIndex = parseInt(searchParams.get("startIndex") || "1", 10);
  const count = parseInt(searchParams.get("count") || "100", 10);

  try {
    const result = await listGroups(orgId, { filter, startIndex, count });
    return NextResponse.json(result, { headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM list groups error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}

/**
 * POST - Create Group
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  try {
    const body = (await request.json()) as CreateSCIMGroupRequest;

    if (!body.displayName) {
      const error: SCIMError = {
        schemas: [SCIM_SCHEMAS.ERROR],
        status: "400",
        scimType: "invalidValue",
        detail: "displayName is required",
      };
      return NextResponse.json(error, { status: 400, headers: SCIM_HEADERS });
    }

    // Get default workspace for org
    const workspace = await prisma.workspace.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    });

    if (!workspace) {
      const error: SCIMError = {
        schemas: [SCIM_SCHEMAS.ERROR],
        status: "400",
        detail: "Organization has no workspaces",
      };
      return NextResponse.json(error, { status: 400, headers: SCIM_HEADERS });
    }

    const result = await createGroup(orgId, workspace.id, body);

    if ("status" in result && result.schemas[0] === SCIM_SCHEMAS.ERROR) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return NextResponse.json(result, { status: 201, headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM create group error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}
