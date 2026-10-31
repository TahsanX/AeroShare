import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { getFileMeta } from "@/server/controllers/downloadController";
import { withRateLimit } from "@/server/services/rateLimitService";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(
  "metadata",
  async (_request: Request, ctx: { params: Promise<{ code: string }> }) => {
    try {
      const { code } = await ctx.params;
      return NextResponse.json(await getFileMeta(code));
    } catch (e) {
      return toErrorResponse(e);
    }
  },
);
