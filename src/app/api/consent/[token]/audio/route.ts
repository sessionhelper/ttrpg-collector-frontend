import { apiHandler } from "@/lib/api-handler";
import { dataApiClient } from "@/lib/data-api-client";

/**
 * Public consent token audio deletion — no auth required.
 */
export const DELETE = apiHandler<{ token: string }>(
  "api.consent.delete_audio",
  async (_req, { params }) => {
    const { token } = await params;
    const res = await dataApiClient.raw(
      `/public/consent/${token}/audio`,
      { op: "consent_delete_audio", method: "DELETE" },
    );
    if (!res.ok && res.status !== 204) {
      return new Response(await res.text(), { status: res.status });
    }
    return new Response(null, { status: 204 });
  },
);
