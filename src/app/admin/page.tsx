import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { getOverview } from "@/server/services/admin.service";
import { TRANSACTION_TYPE_LABEL } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Admin" };

export default async function AdminOverview() {
  const o = await getOverview();
  const stats = [
    { label: "Total siswa", value: o.students, href: "/admin/users" },
    {
      label: "Soal dipublikasikan",
      value: o.publishedQuestions,
      href: "/admin/questions?status=PUBLISHED",
    },
    { label: "Paket aktif", value: o.packages, href: "/admin/packages" },
    { label: "Karakter aktif", value: o.characters, href: "/admin/characters" },
    { label: "Jumlah attempt", value: o.attempts },
    { label: "Pending review", value: o.pendingReviews, href: "/admin/reviews" },
  ];
  return (
    <div>
      <PageHeader title="Overview" description="Ringkasan aktivitas platform." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const body = (
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader className="pb-1">
                <CardDescription>{s.label}</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-black tabular-nums">
                {formatNumber(s.value)}
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {body}
            </Link>
          ) : (
            <div key={s.label}>{body}</div>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ringkasan transaksi koin</CardTitle>
          <CardDescription>
            Koin beredar: <b>{formatNumber(o.circulatingCoins)}</b> · Shard beredar:{" "}
            <b>{formatNumber(o.circulatingShards)}</b>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>Jenis</Th>
                <Th className="text-right">Jumlah transaksi</Th>
                <Th className="text-right">Total koin</Th>
              </tr>
            </thead>
            <tbody>
              {o.coinSummary.length === 0 ? (
                <tr>
                  <Td colSpan={3} className="text-muted-foreground text-center">
                    Belum ada transaksi.
                  </Td>
                </tr>
              ) : (
                o.coinSummary.map((s) => (
                  <tr key={s.type}>
                    <Td>{TRANSACTION_TYPE_LABEL[s.type]}</Td>
                    <Td className="text-right tabular-nums">{formatNumber(s.count)}</Td>
                    <Td className="text-right tabular-nums">{formatNumber(s.total)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
