import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/layout/auth-forms";

export const metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar akun siswa</CardTitle>
        <CardDescription>
          Username akan tampil publik di leaderboard. Email tidak pernah ditampilkan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
        <p className="text-muted-foreground text-center text-sm">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Masuk
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
