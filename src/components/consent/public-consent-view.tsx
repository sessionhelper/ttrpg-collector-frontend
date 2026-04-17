"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDestructive } from "@/components/confirm-destructive";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  token: string;
  initialData: any;
}

export function PublicConsentView({ token, initialData }: Props) {
  const session = initialData.session ?? {};
  const participant = initialData.participant ?? {};

  const displayName =
    participant.display_name ??
    (participant.pseudo_id ?? "").slice(0, 12);
  const sessionLabel =
    session.campaign_name || session.title || session.id?.slice(0, 8) || "Session";

  const [scope, setScope] = useState<"full" | "decline">(
    participant.consent_scope === "full" ? "full" : "decline",
  );
  const [llm, setLlm] = useState<boolean>(
    participant.no_llm_training ?? false,
  );
  const [pub, setPub] = useState<boolean>(
    participant.no_public_release ?? false,
  );
  const [deleted, setDeleted] = useState(false);
  const [, start] = useTransition();

  const declined = scope === "decline";

  const patchConsent = (newScope: "full" | "decline") => {
    setScope(newScope);
    start(async () => {
      const res = await fetch(`/api/consent/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_scope: newScope }),
      });
      if (!res.ok) toast.error("Couldn't update consent");
      else toast.success("Consent updated");
    });
  };

  const patchLicense = (body: Record<string, boolean>) => {
    start(async () => {
      const res = await fetch(`/api/consent/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) toast.error("Couldn't update license flags");
      else toast.success("License updated");
    });
  };

  const deleteAudio = async () => {
    const res = await fetch(`/api/consent/${token}/audio`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Deletion failed");
      return;
    }
    toast.success("Audio deleted");
    setDeleted(true);
  };

  if (deleted) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <h2 className="mb-2 text-xl font-semibold">Audio deleted</h2>
          <p className="text-muted-foreground">
            Your audio for <strong>{sessionLabel}</strong> has been
            permanently deleted. You can close this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Manage your data</h1>
        <p className="mt-1 text-muted-foreground">
          Session: <strong>{sessionLabel}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          You&apos;re managing consent for <strong>{displayName}</strong>.
          This link is unique to you — don&apos;t share it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={scope}
              onChange={(e) =>
                patchConsent(e.target.value as "full" | "decline")
              }
            >
              <option value="full">Full — keep my voice</option>
              <option value="decline">Decline — remove my voice</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Full:</strong> your audio and attributed transcript
            segments are retained for this session. You can still restrict
            how they&apos;re used via the license flags below.{" "}
            <strong>Decline:</strong> your audio will be deleted and your
            transcript segments will be removed from the session. This is
            reversible — you can re-consent later and your data will be
            restored if it hasn&apos;t been permanently purged yet.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>License</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>No LLM training</Label>
              <p className="text-xs text-muted-foreground">
                Exclude your voice data from any language model training
                datasets.
              </p>
            </div>
            <Switch
              checked={llm}
              disabled={declined}
              onCheckedChange={(v) => {
                setLlm(v);
                patchLicense({ no_llm_training: v });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>No public release</Label>
              <p className="text-xs text-muted-foreground">
                Keep your voice data out of any publicly released datasets.
              </p>
            </div>
            <Switch
              checked={pub}
              disabled={declined}
              onCheckedChange={(v) => {
                setPub(v);
                patchLicense({ no_public_release: v });
              }}
            />
          </div>
          {declined && (
            <p className="text-xs italic text-muted-foreground">
              License flags are disabled because you&apos;ve declined
              consent. Change to Full above to set these.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete audio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Permanently delete your audio recordings for this session.
            Transcript segments attributed to you will be retained but
            marked as wiped. This cannot be undone.
          </p>
          <ConfirmDestructive
            trigger={
              <Button variant="destructive" size="sm">
                Delete my audio
              </Button>
            }
            title="Permanently delete your audio?"
            description="This will permanently delete your audio recordings for this session. Transcript segments attributed to you will be retained but marked as wiped. This cannot be undone."
            confirmText={displayName}
            onConfirm={deleteAudio}
          />
        </CardContent>
      </Card>
    </div>
  );
}
