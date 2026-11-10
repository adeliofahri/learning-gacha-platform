"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { adjustmentSchema } from "@/lib/validation/economy";

export function AdjustCoinsForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const form = useForm<
    z.input<typeof adjustmentSchema>,
    unknown,
    z.output<typeof adjustmentSchema>
  >({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { amount: 0, reason: "" },
  });
  const { errors } = form.formState;
  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        setMsg(null);
        try {
          await apiFetch(`/api/admin/users/${userId}/adjust`, { body: values });
          setMsg({ type: "success", text: "Penyesuaian tersimpan." });
          form.reset({ amount: 0, reason: "" });
          router.refresh();
        } catch (e) {
          setMsg({ type: "error", text: errorMessage(e) });
        }
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="amount">Jumlah (negatif untuk mengurangi)</Label>
        <Input
          id="amount"
          type="number"
          aria-invalid={!!errors.amount}
          {...form.register("amount")}
        />
        <FieldError message={errors.amount?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">Alasan</Label>
        <Textarea
          id="reason"
          rows={2}
          aria-invalid={!!errors.reason}
          {...form.register("reason")}
        />
        <FieldError message={errors.reason?.message} />
      </div>
      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        Simpan penyesuaian
      </Button>
    </form>
  );
}

export function UserStatusToggle({
  userId,
  status,
}: {
  userId: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    if (status === "PENDING_VERIFICATION") {
      return (
        <div className="text-right">
          <span className="text-xs font-medium text-muted-foreground">
            Menunggu verifikasi email
          </span>
        </div>
      );
    }

    const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={next === "SUSPENDED" ? "destructive" : "default"}
        disabled={pending}
        onClick={async () => {
          if (
            next === "SUSPENDED" &&
            !window.confirm("Tangguhkan akun ini? Siswa akan langsung keluar dari semua sesi.")
          )
            return;
          setPending(true);
          setError(null);
          try {
            await apiFetch(`/api/admin/users/${userId}`, {
              method: "PATCH",
              body: { status: next },
            });
            router.refresh();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setPending(false);
          }
        }}
      >
        {next === "SUSPENDED" ? "Tangguhkan akun" : "Aktifkan kembali"}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

export function ResetAllStudentStatsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    const confirmed = window.confirm(
      "PERINGATAN!\n\n" +
        "Seluruh statistik SEMUA SISWA akan direset, termasuk:\n" +
        "- Koin dan shard\n" +
        "- Koleksi karakter\n" +
        "- Progres belajar dan leaderboard\n" +
        "- Progres Step-Up dan cooldown\n" +
        "- Avatar karakter\n\n" +
        "Riwayat jawaban, transaksi, dan gacha tetap disimpan.\n\n" +
        "Operasi ini tidak dapat dibatalkan. Lanjutkan?",
    );

    if (!confirmed) return;

    const secondConfirmation = window.confirm(
      'Apakah kamu benar-benar yakin ingin mereset seluruh statistik siswa?'
    );

    if (!secondConfirmation) return;

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch<{
        ok: boolean;
        result: {
          studentsReset: number;
          inventoryItemsDeleted: number;
          solvesDeleted: number;
          packageProgressDeleted: number;
          stepUpProgressDeleted: number;
          cooldownsDeleted: number;
          coinsRemoved: number;
          shardsRemoved: number;
        };
      }>("/api/admin/students/reset-stats", {
        method: "POST",
      });

      const r = response.result;

      setMessage(
        `Reset berhasil. ${r.studentsReset} siswa diproses, ` +
          `${r.inventoryItemsDeleted} item karakter dihapus, ` +
          `${r.solvesDeleted} progres soal dihapus, ` +
          `${r.packageProgressDeleted} progres paket dihapus, ` +
          `${r.coinsRemoved} koin dan ${r.shardsRemoved} shard direset.`,
      );

      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
      <div>
        <h3 className="font-semibold text-destructive">
          Reset seluruh statistik siswa
        </h3>

        <p className="text-sm text-muted-foreground">
          Mengatur ulang saldo, koleksi karakter, progres belajar,
          leaderboard, dan statistik seluruh akun siswa.
          Riwayat aktivitas tetap disimpan.
        </p>
      </div>

      <Button
        variant="destructive"
        disabled={pending}
        onClick={handleReset}
      >
        {pending ? "Sedang mereset..." : "Reset seluruh statistik"}
      </Button>

      {message && (
        <Alert variant="success">
          {message}
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}
    </div>
  );
}