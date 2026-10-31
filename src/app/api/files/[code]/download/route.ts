import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { getDownload } from "@/server/controllers/downloadController";
import { withRateLimit } from "@/server/services/rateLimitService";

export const GET = withRateLimit(
  "download",
  async (_request: Request, ctx: { params: Promise<{ code: string }> }) => {
    try {
      const { code } = await ctx.params;
      return NextResponse.json(await getDownload(code), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e) {
      return toErrorResponse(e);
    }
  },
);
