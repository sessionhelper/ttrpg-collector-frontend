import { NextResponse } from "next/server";

import { apiHandler, parseJson } from "@/lib/api-handler";
import { dataApiClient } from "@/lib/data-api-client";
import { z } from "zod";

/**
 * Public consent token proxy — no auth required. The token IS the auth.
 * GET validates and returns session + participant context.
 * PATCH updates consent scope and/or license flags.
 */

export const GET = apiHandler<{ token: string }>(
  "api.consent.get",
  async (_req, { params }) => {
    const { token } = await params;
    const res = await dataApiClient.raw(`/public/consent/${token}`, {
      op: "consent_validate",
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    return NextResponse.json(await res.json());
  },
);

const PatchBody = z.object({
  consent_scope: z.enum(["full", "decline"]).optional(),
  no_llm_training: z.boolean().optional(),
  no_public_release: z.boolean().optional(),
});

export const PATCH = apiHandler<{ token: string }>(
  "api.consent.patch",
  async (req, { params }) => {
    const { token } = await params;
    const body = await parseJson(req, PatchBody);
    const res = await dataApiClient.raw(`/public/consent/${token}`, {
      op: "consent_patch",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    return NextResponse.json(await res.json());
  },
);
