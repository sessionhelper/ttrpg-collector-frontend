import { NextResponse } from "next/server";

import { apiHandler, parseJson } from "@/lib/api-handler";
import { dataApiClient } from "@/lib/data-api-client";
import { canEditSegment } from "@/lib/filters";
import { SegmentPatchBodySchema } from "@/lib/schemas/bff";
import { AuthError, requireUser } from "@/lib/server-auth";

/**
 * Edit a segment's text, timecodes, or speaker. Authorization: admin
 * OR owning player. User-supplied privileged fields are stripped by
 * Zod; we re-set author_service + author_user_pseudo_id from the
 * authenticated session.
 */
export const PATCH = apiHandler<{ id: string }>(
  "api.segments.patch",
  async (req, { params }) => {
    const { id } = await params;
    const user = await requireUser();
    const body = await parseJson(req, SegmentPatchBodySchema);

    const existing = await dataApiClient.getSegment(id);
    if (!canEditSegment(user, existing)) {
      throw new AuthError(403, "forbidden");
    }

    const updated = await dataApiClient.patchSegment(id, {
      ...body,
      author_service: "chronicle-portal",
      author_user_pseudo_id: user.pseudo_id,
    });
    return NextResponse.json(updated);
  },
);

/**
 * Delete a segment. Admin only.
 */
export const DELETE = apiHandler<{ id: string }>(
  "api.segments.delete",
  async (_req, { params }) => {
    const { id } = await params;
    const user = await requireUser();
    if (!user.is_admin) throw new AuthError(403, "forbidden");

    const res = await dataApiClient.raw(`/internal/segments/${id}`, {
      op: "delete_segment",
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      return new Response(await res.text(), { status: res.status });
    }
    return new Response(null, { status: 204 });
  },
);
