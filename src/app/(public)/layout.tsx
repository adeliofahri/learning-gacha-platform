import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Brand />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navigasi utama">
            <Link
              href="/leaderboard"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-semibold"
            >
              Leaderboard
            </Link>
            {user ? (
              <Button asChild size="sm">
                <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                  {user.role === "ADMIN" ? "Admin" : "Dashboard"}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Daftar</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        Learning Gacha Platform · Semua koin &amp; shard adalah mata uang virtual, tidak dapat
        dibeli dengan uang sungguhan.
      </footer>
    </div>
  );
}
