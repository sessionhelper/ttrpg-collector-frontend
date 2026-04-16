"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function RerunButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleRerun() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rerun`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Pipeline rerun queued");
      } else {
        toast.error(body.error || `Rerun failed (${res.status})`);
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleRerun}
      disabled={loading}
    >
      {loading ? "Queuing…" : "Rerun pipeline"}
    </Button>
  );
}
