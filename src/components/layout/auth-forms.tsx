
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);

        try {
          await apiFetch("/api/auth/login", { body: values });
          router.push("/dashboard");
          router.refresh();
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
    >
      {error && <Alert variant="error">{error}</Alert>}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby="email-error"
          {...form.register("email")}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby="password-error"
          {...form.register("password")}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const { errors, isSubmitting } = form.formState;

  if (registeredEmail) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">Periksa email kamu</h2>

          <p className="text-sm text-muted-foreground">
            Kami telah memproses pendaftaran untuk:
          </p>

          <p className="break-all font-medium">{registeredEmail}</p>

          <p className="text-sm text-muted-foreground">
            Buka email tersebut dan tekan tombol Verifikasi Email.
            Jika tidak menemukannya, periksa folder spam.
          </p>
        </div>

        {resendMessage && (
          <p className="text-sm text-green-600">{resendMessage}</p>
        )}

        {resendError && <Alert variant="error">{resendError}</Alert>}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={resending}
          onClick={async () => {
            setResending(true);
            setResendMessage(null);
            setResendError(null);

            try {
              const result = await apiFetch<{ message: string }>(
                "/api/auth/resend-verification",
                {
                  body: { email: registeredEmail },
                },
              );

              setResendMessage(result.message);
            } catch (e) {
              setResendError(errorMessage(e));
            } finally {
              setResending(false);
            }
          }}
        >
          {resending ? "Mengirim..." : "Kirim ulang email verifikasi"}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);

        try {
          await apiFetch("/api/auth/register", { body: values });
          setRegisteredEmail(values.email);
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
    >
      {error && <Alert variant="error">{error}</Alert>}

      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          autoComplete="username"
          placeholder="contoh: budi_hebat"
          aria-invalid={!!errors.username}
          aria-describedby="username-error"
          {...form.register("username")}
        />
        <FieldError id="username-error" message={errors.username?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby="email-error"
          {...form.register("email")}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby="password-error password-hint"
          {...form.register("password")}
        />

        <p id="password-hint" className="text-xs text-muted-foreground">
          Minimal 8 karakter, mengandung huruf dan angka.
        </p>

        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Mendaftarkan…" : "Daftar"}
      </Button>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setLoading(true);
    setError(null);

    try {
      await apiFetch("/api/auth/verify-email", {
        body: { token },
      });

      setSuccess(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Alert variant="error">
        Tautan verifikasi tidak memiliki token.
      </Alert>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-green-600">
          Email berhasil diverifikasi. Akun kamu sekarang aktif.
        </p>

        <Button
          type="button"
          className="w-full"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          Masuk ke akun
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tekan tombol berikut untuk mengonfirmasi alamat email dan
        mengaktifkan akun Learning Gacha.
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      <Button
        type="button"
        className="w-full"
        disabled={loading}
        onClick={handleVerify}
      >
        {loading ? "Memverifikasi..." : "Verifikasi email"}
      </Button>
    </div>
  );
}
