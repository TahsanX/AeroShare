import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { runCleanup } from "@/server/controllers/cleanupController";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await runCleanup(request.headers.get("authorization")));
  } catch (e) {
    return toErrorResponse(e);
  }
}
