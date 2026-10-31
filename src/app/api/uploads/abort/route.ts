import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { abortUpload } from "@/server/controllers/uploadController";
import { withRateLimit } from "@/server/services/rateLimitService";

export const POST = withRateLimit("abort", async (request) => {
  try {
    return NextResponse.json(await abortUpload(request));
  } catch (err) {
    return toErrorResponse(err);
  }
});
