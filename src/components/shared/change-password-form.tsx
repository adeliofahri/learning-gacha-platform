"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/auth";

export function ChangePasswordForm() {
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        setMsg(null);
        try {
          await apiFetch("/api/account/password", { body: values });
          form.reset();
          setMsg({
            type: "success",
            text: "Password berhasil diganti. Sesi di perangkat lain telah dikeluarkan.",
          });
        } catch (e) {
          setMsg({ type: "error", text: errorMessage(e) });
        }
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Password lama</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...form.register("currentPassword")}
        />
        <FieldError message={errors.currentPassword?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Password baru</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          {...form.register("newPassword")}
        />
        <p className="text-muted-foreground text-xs">
          Minimal 8 karakter, mengandung huruf dan angka.
        </p>
        <FieldError message={errors.newPassword?.message} />
      </div>
      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan…" : "Ganti password"}
      </Button>
    </form>
  );
}
