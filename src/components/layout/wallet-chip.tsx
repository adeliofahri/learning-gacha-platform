"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wallet as WalletIcon } from "lucide-react";
import { CoinAmount, ShardAmount } from "@/components/shared/currency";
import { onWalletUpdate } from "@/lib/wallet-events";

export function WalletChip({ coins, shards }: { coins: number; shards: number }) {
  const [state, setState] = useState({ coins, shards });
  useEffect(() => setState({ coins, shards }), [coins, shards]);
  useEffect(
    () =>
      onWalletUpdate((s) =>
        setState((prev) => ({ coins: s.coins ?? prev.coins, shards: s.shards ?? prev.shards })),
      ),
    [],
  );
  return (
    <Link
      href="/wallet"
      className="bg-card hover:bg-muted flex items-center gap-3 rounded-full border px-3 py-1.5 text-sm"
      aria-label="Saldo dan riwayat transaksi"
      data-testid="wallet-chip"
    >
      <WalletIcon className="text-muted-foreground hidden size-4 sm:block" aria-hidden />
      <CoinAmount value={state.coins} />
      <ShardAmount value={state.shards} />
    </Link>
  );
}
