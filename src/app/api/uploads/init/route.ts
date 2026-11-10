import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { initUpload } from "@/server/controllers/uploadController";
import { withRateLimit } from "@/server/services/rateLimitService";

export const POST = withRateLimit("init", async (request) => {
  try {
    return NextResponse.json(await initUpload(request));
  } catch (err) {
    return toErrorResponse(err);
  }
});
