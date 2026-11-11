
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/layout/auth-forms";

export const metadata = {
  title: "Lupa Password",
};

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lupa Password?</CardTitle>
        <CardDescription>
          Masukkan email yang kamu gunakan untuk mendaftar.
          Kami akan mengirimkan tautan untuk mengatur ulang password.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
