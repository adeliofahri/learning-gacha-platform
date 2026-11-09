"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EventDeleteButton({
  eventId,
  eventName,
  claimCount,
}: {
  eventId: string;
  eventName: string;
  claimCount: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ?? "Gagal menghapus event",
        );
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan",
      );
    } finally {
      setPending(false);
    }
  }

  if (claimCount > 0) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="destructive" disabled>
          <Trash2 />
          Hapus event
        </Button>

        <p className="text-xs text-muted-foreground">
          Event tidak dapat dihapus karena sudah memiliki{" "}
          {claimCount} klaim.
        </p>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 />
        Hapus event
      </Button>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Hapus event permanen?
            </DialogTitle>

            <DialogDescription>
              Event <strong>{eventName}</strong> akan dihapus
              secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Jumlah klaim
              </span>
              <strong>{claimCount}</strong>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Event hanya dapat dihapus jika belum pernah diklaim
            oleh siswa.
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              <Trash2 />
              {pending ? "Menghapus..." : "Ya, hapus event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}