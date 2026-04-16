"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AdminUserListItem } from "@/lib/schemas/data-api";

/**
 * Client-side filtered users table. Text search matches display name
 * or pseudo_id prefix; filter chips narrow by status badge. Expected
 * N is small (<500 users for a while); client-side filter is fine.
 */

type StatusFilter = "all" | "wiped" | "never-consented" | "no-display-name";

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(mo / 12);
  return `${y}y ago`;
}

function statusBadges(u: AdminUserListItem): {
  wiped: boolean;
  neverConsented: boolean;
  noDisplayName: boolean;
} {
  return {
    wiped: !!u.data_wiped_at,
    neverConsented: u.session_count > 0 && !u.has_consent_on_file,
    noDisplayName: !u.latest_display_name,
  };
}

export function UsersTable({ users }: { users: AdminUserListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const name = (u.latest_display_name ?? "").toLowerCase();
        const pid = u.pseudo_id.toLowerCase();
        if (!name.includes(q) && !pid.startsWith(q)) return false;
      }
      if (filter !== "all") {
        const b = statusBadges(u);
        if (filter === "wiped" && !b.wiped) return false;
        if (filter === "never-consented" && !b.neverConsented) return false;
        if (filter === "no-display-name" && !b.noDisplayName) return false;
      }
      return true;
    });
  }, [users, query, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name or pseudo_id prefix…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-1 text-xs">
          {([
            ["all", "All"],
            ["wiped", "Wiped"],
            ["never-consented", "Never consented"],
            ["no-display-name", "No name"],
          ] as [StatusFilter, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={
                "rounded px-2 py-1 " +
                (filter === k
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-accent")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Display name</th>
              <th className="px-3 py-2">pseudo_id</th>
              <th className="px-3 py-2">Sessions</th>
              <th className="px-3 py-2">Last active</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No users match.
                </td>
              </tr>
            )}
            {filtered.map((u) => {
              const b = statusBadges(u);
              return (
                <tr
                  key={u.pseudo_id}
                  className="border-t transition-colors hover:bg-accent/30"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/users/${u.pseudo_id}`}
                      className="font-medium hover:underline"
                    >
                      {u.latest_display_name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Link>
                    {u.is_admin && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        admin
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {u.pseudo_id}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{u.session_count}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {relativeTime(u.last_active_at)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {b.wiped && (
                        <Badge variant="destructive" className="text-[10px]">
                          wiped
                        </Badge>
                      )}
                      {b.neverConsented && (
                        <Badge variant="outline" className="text-[10px]">
                          never consented
                        </Badge>
                      )}
                      {b.noDisplayName && (
                        <Badge variant="outline" className="text-[10px]">
                          no name
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {users.length}.
      </p>
    </div>
  );
}
