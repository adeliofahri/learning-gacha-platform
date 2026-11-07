import {
  BookOpen,
  ClipboardCheck,
  FolderTree,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { LogoutButton } from "@/components/layout/logout-button";
import { NavLink } from "@/components/layout/nav-link";
import { requireAdminPage } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: "Soal", icon: BookOpen },
  { href: "/admin/subjects", label: "Mapel & topik", icon: FolderTree },
  { href: "/admin/packages", label: "Paket", icon: Package },
  { href: "/admin/reviews", label: "Review jawaban", icon: ClipboardCheck },
  { href: "/admin/characters", label: "Karakter", icon: ImageIcon },
  { href: "/admin/banners", label: "Banner gacha", icon: Sparkles },
  { href: "/admin/users", label: "Siswa", icon: Users },
  { href: "/admin/events", label: "Event", icon: Gift },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/account", label: "Akun saya", icon: UserCog },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-card border-b md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between px-4">
          <Brand href="/admin" />
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible"
          aria-label="Navigasi admin"
        >
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact} className="shrink-0">
              <n.icon aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center justify-between border-t px-4 py-3 text-sm md:absolute md:bottom-0 md:flex md:w-[239px]">
          <span className="truncate font-semibold">{admin.username}</span>
          <LogoutButton compact />
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-end border-b px-4 py-2 md:hidden">
          <LogoutButton />
        </div>
        <main id="main" className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
