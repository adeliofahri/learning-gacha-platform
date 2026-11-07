import { BookOpen, Gift, LayoutDashboard, Sparkles, User, Library } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { LogoutButton } from "@/components/layout/logout-button";
import { NavLink } from "@/components/layout/nav-link";
import { WalletChip } from "@/components/layout/wallet-chip";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getWallet } from "@/server/services/wallet.service";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learn", label: "Belajar", icon: BookOpen },
  { href: "/gacha", label: "Gacha", icon: Sparkles },
  { href: "/collection", label: "Koleksi", icon: Library },
  { href: "/events", label: "Event", icon: Gift },
  { href: "/profile", label: "Profil", icon: User },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudentPage();
  const wallet = await getWallet(user.id);
  return (
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Brand href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi siswa">
            {NAV.map((n) => (
              <NavLink key={n.href} href={n.href}>
                <n.icon aria-hidden />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <WalletChip coins={wallet.coins} shards={wallet.shards} />
            <LogoutButton compact />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
      <nav
        className="bg-card fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t md:hidden"
        aria-label="Navigasi siswa (mobile)"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.href}
            href={n.href}
            className="flex-col gap-0.5 rounded-none px-1 py-2 text-[11px]"
          >
            <n.icon aria-hidden />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
