
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/layout/auth-forms";

export const metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atur Ulang Password</CardTitle>
        <CardDescription>
          Buat password baru untuk akun Learning Gacha kamu.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ResetPasswordForm token={params.token ?? ""} />
      </CardContent>
    </Card>
  );
}
