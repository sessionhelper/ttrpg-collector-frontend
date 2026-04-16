import { apiHandler } from "@/lib/api-handler";
import { dataApiClient } from "@/lib/data-api-client";
import { requireAdmin } from "@/lib/server-auth";
import { z } from "zod";

const CreateMuteBody = z.object({
  start_offset_ms: z.number().int().nonnegative(),
  end_offset_ms: z.number().int().nonnegative(),
  reason: z.string().optional(),
});

export const GET = apiHandler<{ id: string; pid: string }>(
  "api.mute.list",
  async (_req, { params }) => {
    const { id, pid } = await params;
    await requireAdmin();
    const ranges = await dataApiClient.listMuteRanges(id, pid);
    return Response.json(ranges);
  },
);

export const POST = apiHandler<{ id: string; pid: string }>(
  "api.mute.create",
  async (req, { params }) => {
    const { id, pid } = await params;
    await requireAdmin();
    const body = CreateMuteBody.parse(await req.json());
    const range = await dataApiClient.createMuteRange(id, pid, body);
    return Response.json(range, { status: 201 });
  },
);
