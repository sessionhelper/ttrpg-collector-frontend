import { apiHandler } from "@/lib/api-handler";
import { dataApiClient } from "@/lib/data-api-client";
import { requireAdmin } from "@/lib/server-auth";

export const DELETE = apiHandler<{ id: string; pid: string; rangeId: string }>(
  "api.mute.delete",
  async (_req, { params }) => {
    const { id, pid, rangeId } = await params;
    await requireAdmin();
    await dataApiClient.removeMuteRange(id, pid, rangeId);
    return new Response(null, { status: 204 });
  },
);
