import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { completeUpload } from "@/server/controllers/uploadController";
import { withRateLimit } from "@/server/services/rateLimitService";

export const POST = withRateLimit("complete", async (request) => {
  try {
    return NextResponse.json(await completeUpload(request));
  } catch (err) {
    return toErrorResponse(err);
  }
});
