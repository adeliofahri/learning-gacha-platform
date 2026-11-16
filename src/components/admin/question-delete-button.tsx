"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function QuestionDeleteButton({ id, title, attempts, solves }: {
  id: string; title: string; attempts: number; solves: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    const confirmed = window.confirm(
      `Hapus soal "${title}" secara permanen? ${attempts} attempt dan ${solves} riwayat solve akan dipertahankan, tetapi dilepaskan dari soal.`
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/questions/${id}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "Gagal menghapus soal.");
      router.push("/admin/questions");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1">
      <Button type="button" variant="destructive" disabled={busy} onClick={remove}>
        {busy ? "Menghapus…" : "Hapus permanen"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
