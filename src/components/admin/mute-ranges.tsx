"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface MuteRange {
  id: string;
  start_offset_ms: number;
  end_offset_ms: number;
  reason?: string | null;
}

function msToTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function MuteRanges({
  sessionId,
  pseudoId,
  participantName,
}: {
  sessionId: string;
  pseudoId: string;
  participantName: string;
}) {
  const [ranges, setRanges] = useState<MuteRange[]>([]);
  const [startMs, setStartMs] = useState("");
  const [endMs, setEndMs] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRanges = useCallback(async () => {
    const res = await fetch(
      `/api/sessions/${sessionId}/participants/${pseudoId}/mute`,
    );
    if (res.ok) setRanges(await res.json());
  }, [sessionId, pseudoId]);

  useEffect(() => {
    fetchRanges();
  }, [fetchRanges]);

  async function handleAdd() {
    const start = parseInt(startMs, 10);
    const end = parseInt(endMs, 10);
    if (isNaN(start) || isNaN(end) || end <= start) {
      toast.error("Invalid range — end must be after start (in ms)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/participants/${pseudoId}/mute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_offset_ms: start,
            end_offset_ms: end,
            reason: reason || undefined,
          }),
        },
      );
      if (res.ok) {
        toast.success("Mute range added");
        setStartMs("");
        setEndMs("");
        setReason("");
        fetchRanges();
      } else {
        toast.error(`Failed (${res.status})`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(rangeId: string) {
    const res = await fetch(
      `/api/sessions/${sessionId}/participants/${pseudoId}/mute/${rangeId}`,
      { method: "DELETE" },
    );
    if (res.ok || res.status === 204) {
      toast.success("Mute range removed");
      fetchRanges();
    } else {
      toast.error(`Delete failed (${res.status})`);
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        {participantName}
      </h4>
      {ranges.length === 0 && (
        <p className="text-xs text-muted-foreground">No mute ranges.</p>
      )}
      {ranges.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
        >
          <span>
            {msToTimestamp(r.start_offset_ms)} – {msToTimestamp(r.end_offset_ms)}
            {r.reason && (
              <span className="ml-2 text-muted-foreground">({r.reason})</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(r.id)}
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Start (ms)</Label>
          <Input
            type="number"
            value={startMs}
            onChange={(e) => setStartMs(e.target.value)}
            className="w-24"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End (ms)</Label>
          <Input
            type="number"
            value={endMs}
            onChange={(e) => setEndMs(e.target.value)}
            className="w-24"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Reason</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="optional"
          />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={loading}>
          Add
        </Button>
      </div>
    </div>
  );
}
