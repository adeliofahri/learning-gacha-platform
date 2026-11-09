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

type PackageDeletePreview = {
  packageId: string;
  title: string;
  questionCount: number;
  affectedStudents: number;
  preservedAttempts: number;
};

export function PackageDeleteButton({
  preview,
}: {
  preview: PackageDeletePreview;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value);

  async function handleDelete() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/packages/${preview.packageId}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ?? "Gagal menghapus paket",
        );
      }

      router.push("/admin/packages");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan",
      );
    } finally {
      setPending(false);
    }
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
        Hapus paket
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
              Hapus paket permanen?
            </DialogTitle>

            <DialogDescription>
              Paket <strong>{preview.title}</strong> akan dihapus
              secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Soal dalam paket
              </span>
              <strong>{formatNumber(preview.questionCount)}</strong>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Siswa dengan progres paket
              </span>
              <strong>{formatNumber(preview.affectedStudents)}</strong>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Riwayat pengerjaan yang dipertahankan
              </span>
              <strong>{formatNumber(preview.preservedAttempts)}</strong>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Soal tidak akan ikut terhapus dan tetap dapat digunakan
            dalam paket lain. Riwayat pengerjaan siswa juga tetap
            tersimpan, tetapi tidak lagi terhubung dengan paket ini.
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
              {pending ? "Menghapus..." : "Ya, hapus paket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}