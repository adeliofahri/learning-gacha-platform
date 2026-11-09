"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Preview = {
  characterId: string;
  characterName: string;
  rarity: number;
  affectedStudents: number;
  totalCopies: number;
  totalRefund: number;
};

export function CharacterDeleteButton({
  preview,
}: {
  preview: Preview;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/characters/${preview.characterId}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ?? "Gagal menghapus karakter",
        );
      }

      router.push("/admin/characters");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan",
      );
    } finally {
      setPending(false);
    }
  }

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value);

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
        Hapus permanen
      </Button>

      <Dialog open={open} onOpenChange={pending ? undefined : setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Hapus karakter permanen?
            </DialogTitle>

            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Karakter{" "}
              <strong>{preview.characterName}</strong> ({preview.rarity}★)
              akan dihapus dari sistem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Siswa terdampak
              </span>
              <strong>{formatNumber(preview.affectedStudents)} siswa</strong>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Total salinan
              </span>
              <strong>{formatNumber(preview.totalCopies)}</strong>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Total refund
              </span>
              <strong className="text-primary">
                {formatNumber(preview.totalRefund)} shard
              </strong>
            </div>

            <div className="border-t pt-3 text-muted-foreground">
              Refund per siswa dihitung dengan rumus:
              <p className="mt-1 font-semibold text-foreground">
                100 × rarity × jumlah salinan
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Inventory siswa dan entri banner akan dihapus. Avatar yang
            menggunakan karakter ini akan dilepas. Riwayat gacha tetap
            tersimpan.
          </div>

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
              {pending ? "Menghapus..." : "Ya, hapus permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}