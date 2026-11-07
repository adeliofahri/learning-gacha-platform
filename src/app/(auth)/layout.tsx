import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  return (
    <main
      id="main"
      className="bg-hero flex min-h-dvh flex-col items-center justify-center gap-6 p-4"
    >
      <Brand />
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
