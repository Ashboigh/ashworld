/**
 * SCIM 2.0 Individual User Endpoint
 * Handles get, update, patch, and delete operations for a specific user
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUser,
  updateUser,
  patchUser,
  deleteUser,
  verifySCIMToken,
} from "@/lib/scim/provisioning";
import {
  SCIM_SCHEMAS,
  CreateSCIMUserRequest,
  SCIMPatchRequest,
  SCIMError,
} from "@/lib/scim/types";

interface RouteParams {
  params: Promise<{ orgId: string; userId: string }>;
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
 * GET - Get User
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  try {
    const result = await getUser(orgId, userId);

    if ("status" in result && result.schemas[0] === SCIM_SCHEMAS.ERROR) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return NextResponse.json(result, { headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM get user error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}

/**
 * PUT - Replace User
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  try {
    const body = (await request.json()) as CreateSCIMUserRequest;
    const result = await updateUser(orgId, userId, body);

    if ("status" in result && result.schemas[0] === SCIM_SCHEMAS.ERROR) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return NextResponse.json(result, { headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM update user error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}

/**
 * PATCH - Partial Update User
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await params;

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

    // Validate schema
    if (!body.schemas?.includes(SCIM_SCHEMAS.PATCH_OP)) {
      const error: SCIMError = {
        schemas: [SCIM_SCHEMAS.ERROR],
        status: "400",
        scimType: "invalidSyntax",
        detail: "Invalid PatchOp schema",
      };
      return NextResponse.json(error, { status: 400, headers: SCIM_HEADERS });
    }

    const result = await patchUser(orgId, userId, body);

    if ("status" in result && result.schemas[0] === SCIM_SCHEMAS.ERROR) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return NextResponse.json(result, { headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM patch user error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}

/**
 * DELETE - Delete User
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await params;

  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  try {
    const result = await deleteUser(orgId, userId);

    if (result && "status" in result) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("SCIM delete user error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}
