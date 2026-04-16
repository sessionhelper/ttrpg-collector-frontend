import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminToggle } from "@/components/admin/admin-toggle";
import { AppShell } from "@/components/app-shell";
import { LocalDate } from "@/components/local-date";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dataApiClient } from "@/lib/data-api-client";
import { requireAdmin } from "@/lib/server-auth";

type Props = { params: Promise<{ pseudo_id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const current = await requireAdmin();
  const { pseudo_id } = await params;

  let detail;
  try {
    detail = await dataApiClient.getAdminUserDetail(pseudo_id);
  } catch {
    notFound();
  }

  const { user, latest_display_name, display_names, sessions } = detail;
  const label = latest_display_name ?? user.pseudo_id.slice(0, 12);
  const isSelf = current.pseudo_id === user.pseudo_id;

  return (
    <AppShell>
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to users
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">{label}</CardTitle>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {user.pseudo_id}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user.is_admin && <Badge variant="secondary">admin</Badge>}
              {user.data_wiped_at && (
                <Badge variant="destructive">wiped</Badge>
              )}
              {isSelf && <Badge variant="outline">you</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>
                {user.created_at ? <LocalDate iso={user.created_at} /> : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Data wiped</p>
              <p>
                {user.data_wiped_at ? (
                  <LocalDate iso={user.data_wiped_at} />
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Known names</p>
              <p>{display_names.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Admin controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <AdminToggle
              pseudoId={user.pseudo_id}
              displayName={latest_display_name ?? null}
              isAdmin={user.is_admin}
              isSelf={isSelf}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Promotion/revocation is audit-logged.
              {isSelf
                ? " You can't change your own admin status from the UI — use a CLI/DB path."
                : ""}
            </p>
          </div>
          <div>
            <button
              disabled
              className="rounded bg-destructive/20 px-3 py-1.5 text-xs text-destructive-foreground opacity-60"
              title="Coming soon — hooks up to user-wide data_wiped_at cascade."
            >
              Wipe this user&apos;s data (coming soon)
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Display-name history ({display_names.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {display_names.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No display names have been recorded for this user.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">First seen</th>
                    <th className="px-3 py-2">Last seen</th>
                    <th className="px-3 py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {display_names.map((d, idx) => (
                    <tr
                      key={`${d.display_name}-${idx}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2 font-medium">
                        {d.display_name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.source ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.first_seen_at ? (
                          <LocalDate iso={d.first_seen_at} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.last_seen_at ? (
                          <LocalDate iso={d.last_seen_at} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {d.seen_count ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              This user has not participated in any sessions yet.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Session</th>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Consent</th>
                    <th className="px-3 py-2">Wiped</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.session_id} className="border-t">
                      <td className="px-3 py-2">
                        <Link
                          href={`/sessions/${s.session_id}`}
                          className="hover:underline"
                        >
                          {s.campaign_name ||
                            s.title ||
                            s.session_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <LocalDate iso={s.started_at} />
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.consent_scope ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.data_wiped_at ? (
                          <LocalDate iso={s.data_wiped_at} />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
