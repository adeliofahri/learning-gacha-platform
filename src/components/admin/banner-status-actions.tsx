"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";

export function BannerStatusActions({
  bannerId,
  status,
  canPublish,
}: {
  bannerId: string;
  status: string;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"publish" | "archive" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const run = async () => {
    if (!confirm) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/banners/${bannerId}/${confirm}`, { body: {} });
      setConfirm(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };
  if (status === "ARCHIVED") return null;
  return (
    <>
      {status === "DRAFT" && (
        <Button onClick={() => setConfirm("publish")} disabled={!canPublish}>
          <Rocket /> Publish
        </Button>
      )}
      <Button variant="outline" onClick={() => setConfirm("archive")}>
        <Archive /> Arsipkan
      </Button>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "publish" ? "Publish banner?" : "Arsipkan banner?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "publish"
                ? "Banner akan terlihat oleh siswa dan dapat dipakai untuk pull sesuai periode. Pastikan rate sudah ditinjau."
                : "Banner tidak dapat dipakai untuk pull baru. Histori dan hasil yang sudah didapat siswa tetap tersimpan."}
            </DialogDescription>
          </DialogHeader>
          {error && <Alert variant="error">{error}</Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Batal
            </Button>
            <Button
              onClick={run}
              disabled={pending}
              variant={confirm === "archive" ? "destructive" : "default"}
            >
              {pending ? "Memproses…" : "Ya, lanjutkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
