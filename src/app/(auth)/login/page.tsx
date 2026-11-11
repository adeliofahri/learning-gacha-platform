import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/layout/auth-forms";

export const metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>Lanjutkan belajar dan kumpulkan karakter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        <LoginForm />

        <p className="text-muted-foreground text-center text-sm">
          Belum punya akun?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Daftar sebagai siswa
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
