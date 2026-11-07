import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/misc";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { requireAdminPage } from "@/lib/auth/current-user";

export const metadata = { title: "Akun admin" };

export default async function AdminAccountPage() {
  const admin = await requireAdminPage();
  return (
    <div className="max-w-md">
      <PageHeader title="Akun admin" description={`${admin.username} · ${admin.email}`} />
      {admin.email.endsWith("@demo.local") && (
        <Alert variant="warning" className="mb-4" title="Akun demo">
          Password akun demo tercantum di dokumentasi. Segera ganti password ini setelah website
          online.
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Ganti password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
