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
  status: "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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
