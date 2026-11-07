"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage } from "@/lib/api-client";

export function ClaimButton({
  eventId,
  disabled,
  reason,
}: {
  eventId: string;
  disabled: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={disabled || pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await apiFetch(`/api/events/${eventId}/claim`, { body: {} });
            router.refresh();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Mengklaim…" : "Klaim bonus"}
      </Button>
      {(error || (disabled && reason)) && (
        <p className="text-destructive text-xs" role="alert">
          {error ?? reason}
        </p>
      )}
    </div>
  );
}
