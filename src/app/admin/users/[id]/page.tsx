import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { CoinAmount, ShardAmount } from "@/components/shared/currency";
import { CharacterTile } from "@/components/shared/rarity";
import { AdjustCoinsForm, UserStatusToggle } from "@/components/admin/user-actions";
import { getStudentDetail } from "@/server/services/admin.service";
import { AppError } from "@/lib/errors";
import { TRANSACTION_TYPE_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Detail siswa" };

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await getStudentDetail(id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { user, transactions } = data;
  return (
    <div className="space-y-6">
      <PageHeader
        title={user.username}
        description={`${user.email} · terdaftar ${formatDateTime(user.createdAt)} · profil ${user.isPublic ? "publik" : "privat"}`}
        actions={<UserStatusToggle userId={user.id} status={user.status} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <p className="text-muted-foreground text-sm">Koin</p>
          </CardHeader>
          <CardContent>
            <CoinAmount value={user.wallet?.coins ?? 0} className="text-2xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <p className="text-muted-foreground text-sm">Shard</p>
          </CardHeader>
          <CardContent>
            <ShardAmount value={user.wallet?.shards ?? 0} className="text-2xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <p className="text-muted-foreground text-sm">Soal solved / attempt</p>
          </CardHeader>
          <CardContent className="text-2xl font-black">
            {user._count.solves} / {user._count.attempts}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <p className="text-muted-foreground text-sm">Status</p>
          </CardHeader>
          <CardContent>
            <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>
              {user.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}
            </Badge>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Transaksi terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState title="Belum ada transaksi" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Waktu</Th>
                    <Th>Jenis</Th>
                    <Th>Keterangan</Th>
                    <Th className="text-right">Jumlah</Th>
                    <Th className="text-right">Saldo</Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <Td className="text-xs whitespace-nowrap">{formatDateTime(t.createdAt)}</Td>
                      <Td>{TRANSACTION_TYPE_LABEL[t.type]}</Td>
                      <Td className="text-muted-foreground text-xs">
                        {t.description}
                        {t.actor && ` (oleh ${t.actor.username})`}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {t.amount > 0 ? "+" : ""}
                        {t.amount} {t.currency === "COIN" ? "koin" : "shard"}
                      </Td>
                      <Td className="text-right tabular-nums">{t.balanceAfter}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Penyesuaian koin</CardTitle>
            <p className="text-muted-foreground text-sm">
              Wajib alasan. Tercatat di ledger dan audit log. Saldo tidak bisa menjadi negatif.
            </p>
          </CardHeader>
          <CardContent>
            <AdjustCoinsForm userId={user.id} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventory ({user.inventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {user.inventory.length === 0 ? (
            <EmptyState title="Belum memiliki karakter" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {user.inventory.map((i) => (
                <CharacterTile
                  key={i.id}
                  character={i.character}
                  footer={
                    <span className="text-muted-foreground text-xs">
                      +{i.duplicateCount} duplikat
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
