/**
 * SCIM 2.0 Users Endpoint
 * Handles list and create operations for users
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listUsers,
  createUser,
  verifySCIMToken,
} from "@/lib/scim/provisioning";
import { SCIM_SCHEMAS, CreateSCIMUserRequest, SCIMError } from "@/lib/scim/types";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// SCIM response headers
const SCIM_HEADERS = {
  "Content-Type": "application/scim+json",
};

/**
 * Verify authorization
 */
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
 * GET - List Users
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;

  // Verify authorization
  if (!(await authorize(request, orgId))) {
    const error: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "401",
      detail: "Invalid or missing bearer token",
    };
    return NextResponse.json(error, { status: 401, headers: SCIM_HEADERS });
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter") || undefined;
  const startIndex = parseInt(searchParams.get("startIndex") || "1", 10);
  const count = parseInt(searchParams.get("count") || "100", 10);

  try {
    const result = await listUsers(orgId, { filter, startIndex, count });
    return NextResponse.json(result, { headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM list users error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}

/**
 * POST - Create User
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;

  // Verify authorization
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

    // Validate required fields
    if (!body.userName) {
      const error: SCIMError = {
        schemas: [SCIM_SCHEMAS.ERROR],
        status: "400",
        scimType: "invalidValue",
        detail: "userName is required",
      };
      return NextResponse.json(error, { status: 400, headers: SCIM_HEADERS });
    }

    const result = await createUser(orgId, body);

    // Check if error
    if ("status" in result && result.schemas[0] === SCIM_SCHEMAS.ERROR) {
      const status = parseInt((result as SCIMError).status, 10);
      return NextResponse.json(result, { status, headers: SCIM_HEADERS });
    }

    return NextResponse.json(result, { status: 201, headers: SCIM_HEADERS });
  } catch (error) {
    console.error("SCIM create user error:", error);
    const scimError: SCIMError = {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: "500",
      detail: "Internal server error",
    };
    return NextResponse.json(scimError, { status: 500, headers: SCIM_HEADERS });
  }
}
