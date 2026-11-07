import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination, Table, Td, Th } from "@/components/ui/misc";
import { CoinAmount, ShardAmount } from "@/components/shared/currency";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getWallet, listTransactions } from "@/server/services/wallet.service";
import { TRANSACTION_TYPE_LABEL } from "@/lib/constants";
import { clampPage, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Wallet" };
const PAGE_SIZE = 20;

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireStudentPage();
  const page = clampPage((await searchParams).page);
  const [wallet, tx] = await Promise.all([
    getWallet(user.id),
    listTransactions(user.id, page, PAGE_SIZE),
  ]);
  return (
    <div>
      <PageHeader
        title="Wallet"
        description="Setiap perubahan saldo tercatat di riwayat transaksi. Koin & shard adalah mata uang virtual."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Saldo koin</CardDescription>
          </CardHeader>
          <CardContent>
            <CoinAmount value={wallet.coins} className="text-3xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Saldo shard</CardDescription>
          </CardHeader>
          <CardContent>
            <ShardAmount value={wallet.shards} className="text-3xl" />
          </CardContent>
        </Card>
      </div>
      {tx.items.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi"
          description="Kerjakan soal untuk mendapatkan koin pertamamu."
        />
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
            {tx.items.map((t) => (
              <tr key={t.id}>
                <Td className="whitespace-nowrap">{formatDateTime(t.createdAt)}</Td>
                <Td>
                  <Badge variant="secondary">{TRANSACTION_TYPE_LABEL[t.type]}</Badge>
                </Td>
                <Td className="text-muted-foreground max-w-xs">{t.description}</Td>
                <Td
                  className={cn(
                    "text-right font-bold tabular-nums",
                    t.amount > 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount} {t.currency === "COIN" ? "koin" : "shard"}
                </Td>
                <Td className="text-right tabular-nums">{t.balanceAfter}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} total={tx.total} pageSize={PAGE_SIZE} baseHref="/wallet" />
    </div>
  );
}
