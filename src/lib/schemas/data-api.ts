/**
 * Zod schemas for chronicle-data-api types — authoritative shape reference
 * for anything flowing in or out of the BFF. Every data-api response used
 * by the portal should be parsed through these before it leaves the server
 * boundary.
 *
 * Aligned against live data-api responses via audit 2026-04-16. Drift is
 * the norm here — data-api's Rust types evolve faster than the portal
 * rebuilds, so these schemas stay forgiving: unknown fields allowed,
 * optional where the response can legitimately omit the field.
 */

import { z } from "zod";

export const PseudoIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/, "invalid pseudo_id format: expected 24 hex chars");

// Session state machine from chronicle-data-api §2.
export const SessionStatusSchema = z.enum([
  "recording",
  "uploaded",
  "claim",
  "transcribing",
  "transcribed",
  "transcribing_failed",
  "abandoned",
  "deleted",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  // guild_id arrives as a JSON number (Discord snowflake, fits in i64) — coerce to string for UI use.
  guild_id: z.union([z.string(), z.number()]).transform(String),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  abandoned_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  status: SessionStatusSchema,
  game_system: z.string().nullable().optional(),
  campaign_name: z.string().nullable().optional(),
  // title / initiator_pseudo_id / segment_count / updated_at — not currently
  // returned by list or detail endpoints; kept optional for forward-compat.
  title: z.string().nullable().optional(),
  initiator_pseudo_id: z.string().nullable().optional(),
  participant_count: z.number().int().nonnegative().nullable().default(0),
  segment_count: z.number().int().nonnegative().nullable().default(0),
  s3_prefix: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const SessionListSchema = z.array(SessionSchema);

export const SessionSummarySchema = z.object({
  session_id: z.string().optional(),
  chunk_count: z.number().int().nonnegative().nullable().default(0),
  participant_count: z.number().int().nonnegative().nullable().default(0),
  duration_ms: z.number().int().nonnegative().nullable().default(0),
  segment_count: z.number().int().nonnegative().nullable().default(0),
  beat_count: z.number().int().nonnegative().default(0),
  scene_count: z.number().int().nonnegative().default(0),
  mute_range_count: z.number().int().nonnegative().default(0),
  aggregate_license_flags: z
    .object({
      no_llm_training: z.boolean(),
      no_public_release: z.boolean(),
    })
    .optional(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

const ParticipantBaseSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  pseudo_id: z.string(),
  user_pseudo_id: z.string().nullable().optional(),
  mid_session_join: z.boolean().default(false),
  display_name: z.string().nullable().optional(),
  character_name: z.string().nullable().optional(),
  consent_scope: z.enum(["full", "decline", "timed_out"]).nullable().optional(),
  consented_at: z.string().nullable().optional(),
  no_llm_training: z.boolean().default(false),
  no_public_release: z.boolean().default(false),
  joined_at: z.string().optional(),
  left_at: z.string().nullable().optional(),
  data_wiped_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
// Data-api returns `pseudo_id`; some legacy paths refer to `user_pseudo_id`.
// Normalize so downstream code can always read `user_pseudo_id`.
export const ParticipantSchema = ParticipantBaseSchema.transform((p) => ({
  ...p,
  user_pseudo_id: p.user_pseudo_id ?? p.pseudo_id,
}));
export type Participant = z.infer<typeof ParticipantSchema>;

export const ParticipantListSchema = z.array(ParticipantSchema);

export const SegmentSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  client_id: z.string().optional(),
  pseudo_id: z.string(),
  start_ms: z.number().int().nonnegative(),
  end_ms: z.number().int().nonnegative(),
  text: z.string().nullable(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  flags: z.record(z.string(), z.unknown()).optional(),
  original: z.unknown().optional(),
  etag: z.string().optional(),
  author_service: z.string().nullable().optional(),
  author_user_pseudo_id: z.string().nullable().optional(),
  // beat_id / scene_id are linkage fields not yet populated by data-api;
  // optional for forward-compat.
  beat_id: z.string().nullable().optional(),
  scene_id: z.string().nullable().optional(),
  // Legacy/fallback fields — some downstream components read these as
  // defaults when the canonical field is missing. Keep optional so code
  // compiles; data-api does not return them.
  speaker_pseudo_id: z.string().optional(),
  segment_index: z.number().int().optional(),
  start_time: z.number().optional(),
  end_time: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type Segment = z.infer<typeof SegmentSchema>;

export const SegmentListSchema = z.array(SegmentSchema);

export const UserSchema = z.object({
  pseudo_id: z.string(),
  is_admin: z.boolean().default(false),
  data_wiped_at: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

// /internal/users/{pseudo_id} wraps the user in an envelope with the
// latest-known display name. upsertUser (POST) returns the flat user.
export const UserEnvelopeSchema = z.object({
  user: UserSchema,
  latest_display_name: z.string().nullable().optional(),
});
export type UserEnvelope = z.infer<typeof UserEnvelopeSchema>;

export const MuteRangeSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  pseudo_id: z.string(),
  start_offset_ms: z.number(),
  end_offset_ms: z.number(),
  reason: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type MuteRange = z.infer<typeof MuteRangeSchema>;

export const DisplayNameSchema = z.object({
  pseudo_id: z.string(),
  display_name: z.string(),
  first_seen_at: z.string().optional(),
  last_seen_at: z.string().optional(),
  seen_count: z.number().int().nonnegative().optional(),
  source: z.string().optional(),
});

export const DisplayNameListSchema = z.array(DisplayNameSchema);
