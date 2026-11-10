import { VerifyEmailForm } from "@/components/layout/auth-forms";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full space-y-6 rounded-xl border p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Verifikasi Email</h1>
          <p className="text-sm text-muted-foreground">
            Learning Gacha
          </p>
        </div>

        <VerifyEmailForm token={params.token ?? ""} />
      </section>
    </main>
  );
}