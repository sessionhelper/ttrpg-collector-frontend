/**
 * Shared data-fetch helpers for server components. These mirror what the
 * BFF API does so that pages don't need to call their own /api routes
 * (one fewer hop, one fewer place for drift). The security rules still
 * live in `server-auth.ts` + `filters.ts`.
 */

import { dataApiClient } from "@/lib/data-api-client";
import {
  filterSegmentsForRole,
  filterSessionsForUser,
} from "@/lib/filters";
import type {
  Participant,
  Segment,
  Session,
  SessionSummary,
} from "@/lib/schemas/data-api";
import {
  requireSessionAccess,
  requireUser,
  type RequestUser,
  type SessionRole,
} from "@/lib/server-auth";

export async function fetchVisibleSessions(
  user: RequestUser,
): Promise<Session[]> {
  const sessions = await dataApiClient.listSessions();
  if (user.is_admin) return sessions;
  const map = new Map<string, Set<string>>();
  for (const session of sessions) {
    try {
      const participants = await dataApiClient.listParticipants(session.id);
      for (const p of participants) {
        if (!p.user_pseudo_id) continue;
        const set = map.get(p.user_pseudo_id) ?? new Set();
        set.add(session.id);
        map.set(p.user_pseudo_id, set);
      }
    } catch {
      // skip session-level errors
    }
  }
  return filterSessionsForUser(user, sessions, map);
}

export async function fetchSessionDetail(sessionId: string): Promise<{
  user: RequestUser;
  role: SessionRole;
  session: Session;
  participants: Participant[];
  segments: Segment[];
  summary: SessionSummary;
}> {
  const user = await requireUser();
  const { role } = await requireSessionAccess(user, sessionId);
  const [session, participants, segments, summary] = await Promise.all([
    dataApiClient.getSession(sessionId),
    dataApiClient.listParticipants(sessionId),
    dataApiClient.listSegments(sessionId),
    dataApiClient.getSessionSummary(sessionId),
  ]);

  // Enrich participants with the latest display_name from user_display_names.
  // The session_participants row doesn't carry it, so we look it up per
  // pseudo_id. Small N (one per speaker), runs in parallel.
  const enriched = await Promise.all(
    participants.map(async (p) => {
      if (p.display_name) return p;
      const pid = p.user_pseudo_id ?? p.pseudo_id;
      if (!pid) return p;
      try {
        const res = await dataApiClient.raw(`/internal/users/${pid}`, {
          op: "get_user_for_participant",
        });
        if (!res.ok) return p;
        const body = (await res.json()) as { latest_display_name?: string | null };
        return body.latest_display_name
          ? { ...p, display_name: body.latest_display_name }
          : p;
      } catch {
        return p;
      }
    }),
  );

  return {
    user,
    role,
    session,
    participants: enriched,
    segments: filterSegmentsForRole(user, role, segments),
    summary,
  };
}
