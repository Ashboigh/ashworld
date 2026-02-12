/**
 * SCIM 2.0 Individual Group Endpoint
 * Handles get, patch, and delete operations for a specific group
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getGroup,
  patchGroup,
  deleteGroup,
  verifySCIMToken,
} from "@/lib/scim/provisioning";
import { SCIM_SCHEMAS, SCIMPatchRequest, SCIMError } from "@/lib/scim/types";

interface RouteParams {
  params: Promise<{ orgId: string; groupId: string }>;
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
 * GET - Get Group
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId, groupId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  try {
    const result = await getGroup(orgId, groupId);

    if ("status" in result && result.schemas[0] === SCIM_SCHEMAS.ERROR) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return NextResponse.json(result, { headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM get group error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}

/**
 * PATCH - Partial Update Group
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, groupId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  try {
    const body = (await request.json()) as SCIMPatchRequest;

    if (!body.schemas?.includes(SCIM_SCHEMAS.PATCH_OP)) {
      const error: SCIMError = {
        schemas: [SCIM_SCHEMAS.ERROR],
        status: "400",
        scimType: "invalidSyntax",
        detail: "Invalid PatchOp schema",
      };
      return NextResponse.json(error, { status: 400, headers: SCIM_HEADERS });
    }

    const result = await patchGroup(orgId, groupId, body);

    if ("status" in result && result.schemas[0] === SCIM_SCHEMAS.ERROR) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return NextResponse.json(result, { headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM patch group error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}

/**
 * DELETE - Delete Group
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId, groupId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  try {
    const result = await deleteGroup(orgId, groupId);

    if (result && "status" in result) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("SCIM delete group error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}
