import { AppShell } from "@/components/app-shell";
import { UsersTable } from "@/components/admin/users-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dataApiClient } from "@/lib/data-api-client";
import type { AdminUserListItem } from "@/lib/schemas/data-api";
import { requireAdmin } from "@/lib/server-auth";

export default async function AdminPage() {
  await requireAdmin();
  let users: AdminUserListItem[] = [];
  try {
    users = await dataApiClient.listAdminUsers();
  } catch (err) {
    console.error("listAdminUsers failed", err);
    users = [];
  }

  const adminCount = users.filter((u) => u.is_admin).length;
  const wipedCount = users.filter((u) => !!u.data_wiped_at).length;

  return (
    <AppShell>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} users · {adminCount} admin
          {wipedCount > 0 ? ` · ${wipedCount} wiped` : ""}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users returned. Check that the data-api exposes
              <code className="mx-1 font-mono text-xs">
                /internal/admin/users
              </code>
              with the enriched shape (see
              <code className="mx-1 font-mono text-xs">
                sessionhelper-hub/docs/admin-users-spec.md
              </code>
              ).
            </p>
          ) : (
            <UsersTable users={users} />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
