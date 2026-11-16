"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage } from "@/lib/api-client";

export function ContributionRejectButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function reject() {
    if (!window.confirm("Tolak dan hapus permanen kontribusi ini? Kuota kontributor tidak akan dikembalikan.")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/contributions/${id}`, {
        method: "POST",
        body: { action: "REJECT" },
      });
      router.push("/admin/contributions");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <Button type="button" variant="destructive" disabled={busy} onClick={reject}>
        {busy ? "Memproses…" : "Tolak & hapus kontribusi"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
