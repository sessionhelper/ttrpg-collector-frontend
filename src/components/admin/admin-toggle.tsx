"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Admin-promotion toggle for the user-detail page. Behind a confirm
 * dialog — promoting an admin is rare and shouldn't be a quick
 * switch-flick. Disabled when operating on yourself (can't remove
 * your own admin from the UI; use a CLI/DB path for that).
 */
export function AdminToggle({
  pseudoId,
  displayName,
  isAdmin,
  isSelf,
}: {
  pseudoId: string;
  displayName: string | null;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const label = displayName ?? `${pseudoId.slice(0, 8)}…`;
  const nextVal = !isAdmin;
  const actionWord = nextVal ? "Promote" : "Revoke";

  const submit = () => {
    start(async () => {
      const res = await fetch(`/api/admin/users/${pseudoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: nextVal }),
      });
      if (!res.ok) {
        toast.error(`Couldn't update admin status (${res.status})`);
        return;
      }
      toast.success(nextVal ? "Admin granted" : "Admin revoked");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant={isAdmin ? "destructive" : "default"}
        size="sm"
        disabled={isSelf}
        onClick={() => setOpen(true)}
        title={
          isSelf
            ? "You can't change your own admin status from the UI."
            : undefined
        }
      >
        {isAdmin ? "Revoke admin" : "Promote to admin"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionWord} {isAdmin ? "admin from" : "to admin"} {label}?
            </DialogTitle>
            <DialogDescription>
              pseudo_id <code className="font-mono">{pseudoId}</code>.
              {nextVal
                ? " Admin users have read/write access to every session, every participant's data, and every other user's admin flag."
                : " They'll lose the ability to view sessions they weren't a participant in, rerun pipelines, and manage other users."}
              {" "}This action is audit-logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={nextVal ? "default" : "destructive"}
              onClick={submit}
              disabled={pending}
            >
              {pending ? "Working…" : `${actionWord} ${nextVal ? "to admin" : "admin"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
