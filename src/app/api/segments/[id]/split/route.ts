import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { apiHandler, parseJson } from "@/lib/api-handler";
import { dataApiClient } from "@/lib/data-api-client";
import { AuthError, requireUser } from "@/lib/server-auth";
import { z } from "zod";

const SplitBody = z.object({
  /** Split point in milliseconds (relative to session start). Must be
   *  between the segment's start_ms and end_ms. */
  split_ms: z.number().int().nonnegative(),
  /** Optional text for the second (new) segment. If omitted, the
   *  original text stays on the first half and the second gets "". */
  second_text: z.string().optional(),
});

/**
 * Split a segment into two at a given millisecond offset.
 *
 * 1. PATCH the original segment's end_ms to split_ms.
 * 2. POST a new segment with start_ms=split_ms, end_ms=original_end_ms.
 *
 * Admin only.
 */
export const POST = apiHandler<{ id: string }>(
  "api.segments.split",
  async (req, { params }) => {
    const { id } = await params;
    const user = await requireUser();
    if (!user.is_admin) throw new AuthError(403, "forbidden");

    const body = await parseJson(req, SplitBody);
    const original = await dataApiClient.getSegment(id);

    if (body.split_ms <= original.start_ms || body.split_ms >= original.end_ms) {
      return NextResponse.json(
        { error: "split_ms must be between start_ms and end_ms" },
        { status: 400 },
      );
    }

    // 1. Shorten the original to [start_ms, split_ms)
    const patched = await dataApiClient.patchSegment(id, {
      end_ms: body.split_ms,
      author_service: "chronicle-portal",
      author_user_pseudo_id: user.pseudo_id,
    });

    // 2. Create the second half as a new segment
    const newSegPayload = {
      segments: [
        {
          client_id: uuidv4(),
          start_ms: body.split_ms,
          end_ms: original.end_ms,
          pseudo_id: original.pseudo_id,
          text: body.second_text ?? "",
          confidence: original.confidence,
          author_user_pseudo_id: user.pseudo_id,
        },
      ],
    };

    const createRes = await dataApiClient.raw(
      `/internal/sessions/${original.session_id}/segments`,
      {
        op: "create_split_segment",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSegPayload),
      },
    );

    if (!createRes.ok) {
      return NextResponse.json(
        { error: "failed to create second segment" },
        { status: 500 },
      );
    }

    const created = (await createRes.json()) as {
      inserted: Array<{ id: string }>;
    };
    const newSegId = created.inserted?.[0]?.id;

    return NextResponse.json({
      first: patched,
      second_id: newSegId,
    });
  },
);
